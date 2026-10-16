package api

import (
	"errors"
	"fmt"
	"net/http"

	"optiontrading/backend/internal/campaigns"
)

//	GET    /api/campaigns            list + summary
//	POST   /api/campaigns            create
//	GET    /api/campaigns/{id}       one campaign
//	PUT    /api/campaigns/{id}       update
//	DELETE /api/campaigns/{id}       delete
func (a *API) campaignRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/campaigns", a.listCampaigns)
	mux.HandleFunc("POST /api/campaigns", a.createCampaign)
	mux.HandleFunc("GET /api/campaigns/{id}", a.getCampaign)
	mux.HandleFunc("PUT /api/campaigns/{id}", a.updateCampaign)
	mux.HandleFunc("DELETE /api/campaigns/{id}", a.deleteCampaign)
}

func (a *API) listCampaigns(w http.ResponseWriter, r *http.Request) {
	uid := a.userID(r)
	list, err := a.campaigns.List(r.Context(), uid)
	if err != nil {
		a.internalError(w, "list campaigns", err)
		return
	}
	if list == nil {
		list = []campaigns.Campaign{}
	}
	summary, err := a.campaigns.Summarize(r.Context(), uid)
	if err != nil {
		a.internalError(w, "summarize campaigns", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"campaigns": list, "summary": summary})
}

func (a *API) getCampaign(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	c, err := a.campaigns.Get(r.Context(), id, a.userID(r))
	if err != nil {
		a.campaignError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) createCampaign(w http.ResponseWriter, r *http.Request) {
	var in campaigns.Input
	if !decodeBody(w, r, &in) {
		return
	}
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Validation failed.", "fields": errs})
		return
	}
	c, err := a.campaigns.Create(r.Context(), in, a.userID(r))
	if err != nil {
		a.campaignError(w, err)
		return
	}
	w.Header().Set("Location", fmt.Sprintf("/api/campaigns/%d", c.ID))
	writeJSON(w, http.StatusCreated, c)
}

func (a *API) updateCampaign(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	var in campaigns.Input
	if !decodeBody(w, r, &in) {
		return
	}
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"error": "Validation failed.", "fields": errs})
		return
	}
	c, err := a.campaigns.Update(r.Context(), id, in, a.userID(r))
	if err != nil {
		a.campaignError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (a *API) deleteCampaign(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	if err := a.campaigns.Delete(r.Context(), id, a.userID(r)); err != nil {
		a.campaignError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) campaignError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, campaigns.ErrNotFound):
		writeError(w, http.StatusNotFound, "Campaign not found.")
	case errors.Is(err, campaigns.ErrDuplicateName):
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":  "A campaign with this name already exists.",
			"fields": campaigns.FieldErrors{"name": "This name is already in use."},
		})
	default:
		a.internalError(w, "campaign", err)
	}
}
