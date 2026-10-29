package api

import (
	"errors"
	"net/http"
	"strconv"

	"optiontrading/backend/internal/approaches"
	"optiontrading/backend/internal/campaigns"
	"optiontrading/backend/internal/watchlists"
)

// Dashboard endpoints for the signed-in user (X-User-Id):
//
//	GET   /api/dashboard?campaignId=7      campaign switcher + the active campaign's data
//	PUT   /api/dashboard/active            {"campaignId": 7} remember the selection
//	PATCH /api/campaigns/{id}/settings     partial: approachId, watchlistId, marketOutlook,
//	                                       strategies, moneyness, holdingDuration, risk
//	                                       (setting approachId copies the template's values)
func (a *API) dashboardRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/dashboard", a.getDashboard)
	mux.HandleFunc("PUT /api/dashboard/active", a.setActiveCampaign)
	mux.HandleFunc("PATCH /api/campaigns/{id}/settings", a.setCampaignSettings)
	mux.HandleFunc("PATCH /api/campaigns/{id}/links", a.setCampaignSettings) // earlier name
}

type campaignChoice struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	StartDate string `json:"startDate"`
	EndDate   string `json:"endDate"`
}

type namedChoice struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Count int    `json:"count,omitempty"`
}

type dashboardCampaign struct {
	campaigns.Campaign
	Metrics campaigns.Metrics `json:"metrics"`
}

type dashboardResponse struct {
	Campaigns  []campaignChoice         `json:"campaigns"`
	Campaign   *dashboardCampaign       `json:"campaign"` // nil when the user has none
	Watchlist  *watchlists.Watchlist    `json:"watchlist"`
	Approach   *approaches.Approach     `json:"approach"`
	Watchlists []namedChoice            `json:"watchlists"`
	Approaches []namedChoice            `json:"approaches"`
	Options    campaigns.SettingOptions `json:"campaignOptions"`
}

func (a *API) getDashboard(w http.ResponseWriter, r *http.Request) {
	ctx, uid := r.Context(), a.userID(r)
	list, err := a.campaigns.List(ctx, uid)
	if err != nil {
		a.internalError(w, "list campaigns", err)
		return
	}
	resp := dashboardResponse{Campaigns: []campaignChoice{}, Watchlists: []namedChoice{}, Approaches: []namedChoice{}, Options: campaigns.Options}
	for _, c := range list {
		resp.Campaigns = append(resp.Campaigns, campaignChoice{ID: c.ID, Name: c.Name, Status: c.Status, StartDate: c.StartDate, EndDate: c.EndDate})
	}

	// Pick: ?campaignId, else the remembered one, else the newest.
	want, _ := strconv.ParseInt(r.URL.Query().Get("campaignId"), 10, 64)
	if want == 0 {
		want, _ = a.campaigns.ActiveID(ctx, uid)
	}
	var active *campaigns.Campaign
	for i := range list {
		if list[i].ID == want {
			active = &list[i]
		}
	}
	if active == nil && len(list) > 0 {
		active = &list[0]
	}

	if wls, err := a.watchlists.List(ctx, uid); err == nil {
		for _, wl := range wls {
			resp.Watchlists = append(resp.Watchlists, namedChoice{ID: wl.ID, Name: wl.Name, Count: len(wl.Tickers)})
		}
	}
	if aps, err := a.approaches.List(ctx); err == nil {
		for _, ap := range aps {
			resp.Approaches = append(resp.Approaches, namedChoice{ID: ap.ID, Name: ap.Name})
		}
	}

	if active != nil {
		resp.Campaign = &dashboardCampaign{Campaign: *active, Metrics: active.MetricsAt(a.now())}
		if active.WatchlistID != nil {
			if wl, err := a.watchlists.Get(ctx, *active.WatchlistID, uid); err == nil {
				resp.Watchlist = &wl
			}
		}
		if active.ApproachID != nil {
			if ap, err := a.approaches.Get(ctx, *active.ApproachID); err == nil {
				resp.Approach = &ap
			}
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

func (a *API) setActiveCampaign(w http.ResponseWriter, r *http.Request) {
	var in struct {
		CampaignID int64 `json:"campaignId"`
	}
	if !decodeBody(w, r, &in) {
		return
	}
	err := a.campaigns.SetActive(r.Context(), in.CampaignID, a.userID(r))
	switch {
	case errors.Is(err, campaigns.ErrNotFound):
		writeError(w, http.StatusNotFound, "Campaign not found.")
	case err != nil:
		a.internalError(w, "set active campaign", err)
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *API) setCampaignSettings(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var in campaigns.Settings
	if !decodeBody(w, r, &in) {
		return
	}
	in.Normalize()
	uid := a.userID(r)
	// The linked watchlist / approach must exist (and the watchlist be the user's).
	if in.WatchlistID != nil {
		if _, err := a.watchlists.Get(r.Context(), *in.WatchlistID, uid); err != nil {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Unknown watchlist.", "fields": map[string]string{"watchlistId": "Choose one of your watchlists."}})
			return
		}
	}
	if in.ApproachID != nil {
		ap, err := a.approaches.Get(r.Context(), *in.ApproachID)
		if err != nil {
			writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Unknown approach.", "fields": map[string]string{"approachId": "Choose an existing approach."}})
			return
		}
		// Copy the template's values unless this request sets them itself.
		t := campaigns.FromTemplate(ap.Strategies, ap.Moneyness, ap.HoldingPeriod, ap.Risk)
		if in.Strategies == nil {
			in.Strategies = t.Strategies
		}
		if in.Moneyness == "" {
			in.Moneyness = t.Moneyness
		}
		if in.HoldingDuration == "" {
			in.HoldingDuration = t.HoldingDuration
		}
		if in.Risk == "" {
			in.Risk = t.Risk
		}
	}
	if fields := in.Validate(); len(fields) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Invalid input.", "fields": fields})
		return
	}
	c, err := a.campaigns.ApplySettings(r.Context(), id, in, uid)
	switch {
	case errors.Is(err, campaigns.ErrNotFound):
		writeError(w, http.StatusNotFound, "Campaign not found.")
	case err != nil:
		a.internalError(w, "set campaign links", err)
	default:
		writeJSON(w, http.StatusOK, dashboardCampaign{Campaign: c, Metrics: c.MetricsAt(a.now())})
	}
}
