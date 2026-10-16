package api

import (
	"errors"
	"net/http"

	"optiontrading/backend/internal/notifications"
)

func (a *API) notificationRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/notifications", a.listNotifications)
	mux.HandleFunc("POST /api/notifications", a.createNotification)
	mux.HandleFunc("PUT /api/notifications/{id}/read", a.markNotificationRead)
	mux.HandleFunc("POST /api/notifications/read-all", a.markAllNotificationsRead)
	mux.HandleFunc("DELETE /api/notifications/{id}", a.deleteNotification)
}

func (a *API) listNotifications(w http.ResponseWriter, r *http.Request) {
	list, err := a.notifications.List(r.Context(), a.userID(r))
	if err != nil {
		a.internalError(w, "list notifications", err)
		return
	}
	if list == nil {
		list = []notifications.Notification{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"notifications": list})
}

func (a *API) createNotification(w http.ResponseWriter, r *http.Request) {
	var in notifications.Input
	if !decodeBody(w, r, &in) {
		return
	}
	n, err := a.notifications.Create(r.Context(), in, a.userID(r))
	if err != nil {
		a.internalError(w, "create notification", err)
		return
	}
	writeJSON(w, http.StatusCreated, n)
}

func (a *API) markNotificationRead(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	if err := a.notifications.MarkRead(r.Context(), id, a.userID(r)); err != nil {
		if errors.Is(err, notifications.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Notification not found.")
		} else {
			a.internalError(w, "mark read", err)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) markAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	if err := a.notifications.MarkAllRead(r.Context(), a.userID(r)); err != nil {
		a.internalError(w, "mark all read", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) deleteNotification(w http.ResponseWriter, r *http.Request) {
	id, ok := pathInt64(w, r, "id")
	if !ok {
		return
	}
	if err := a.notifications.Delete(r.Context(), id, a.userID(r)); err != nil {
		if errors.Is(err, notifications.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Notification not found.")
		} else {
			a.internalError(w, "delete notification", err)
		}
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
