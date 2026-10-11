package approaches

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"optiontrading/backend/internal/store"
)

func newRepo(t *testing.T) *Repository {
	t.Helper()
	db, err := store.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return NewRepository(db)
}

func validInput() Input {
	return Input{
		Name: "Income", Strategies: []string{"Covered Call"}, Moneyness: "OTM", HoldingPeriod: "30-45d",
		MinYield: 8, Risk: "lower", TakeProfit: 75, StopLoss: 15, MaxPosition: 10, AssignmentHandling: "roll",
	}
}

func TestCRUD(t *testing.T) {
	ctx := context.Background()
	r := newRepo(t)

	in := validInput()
	in.AutoRoll = true
	created, err := r.Create(ctx, in)
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == 0 || created.Name != "Income" || !created.AutoRoll || created.CreatedAt.IsZero() {
		t.Fatalf("unexpected created approach: %+v", created)
	}

	in.Name = "Income v2"
	in.Strategies = []string{"Iron Condor", "Collar"}
	updated, err := r.Update(ctx, created.ID, in)
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "Income v2" || len(updated.Strategies) != 2 || updated.Strategies[1] != "Collar" {
		t.Fatalf("update not applied: %+v", updated)
	}

	list, err := r.List(ctx)
	if err != nil || len(list) != 1 {
		t.Fatalf("list = %v, %v", list, err)
	}

	if err := r.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := r.Get(ctx, created.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("get after delete: %v, want ErrNotFound", err)
	}
	if _, err := r.Update(ctx, 999, in); !errors.Is(err, ErrNotFound) {
		t.Errorf("update missing: %v, want ErrNotFound", err)
	}
}

func TestDuplicateNameIsCaseInsensitive(t *testing.T) {
	ctx := context.Background()
	r := newRepo(t)
	if _, err := r.Create(ctx, validInput()); err != nil {
		t.Fatal(err)
	}
	dup := validInput()
	dup.Name = "INCOME"
	if _, err := r.Create(ctx, dup); !errors.Is(err, ErrDuplicateName) {
		t.Errorf("err = %v, want ErrDuplicateName", err)
	}
}

func TestSeedDemoOnceAndInUseCannotBeDeleted(t *testing.T) {
	ctx := context.Background()
	r := newRepo(t)
	for i := 0; i < 2; i++ {
		if err := r.SeedDemo(ctx); err != nil {
			t.Fatal(err)
		}
	}
	list, _ := r.List(ctx)
	if len(list) != len(demoApproaches) {
		t.Fatalf("seeded %d approaches, want %d (seed must run once)", len(list), len(demoApproaches))
	}
	if list[0].UsedInCampaigns != 2 {
		t.Errorf("usedInCampaigns = %d, want 2", list[0].UsedInCampaigns)
	}
	if err := r.Delete(ctx, list[0].ID); !errors.Is(err, ErrInUse) {
		t.Errorf("delete in-use approach: %v, want ErrInUse", err)
	}
}

func TestValidate(t *testing.T) {
	in := Input{Name: "  Spaced   name ", Strategies: []string{"Covered Call", "Covered Call", "Made Up"}}
	in.Normalize()
	if in.Name != "Spaced name" || len(in.Strategies) != 2 {
		t.Errorf("normalize: %+v", in)
	}
	errs := in.Validate()
	for _, field := range []string{"strategies", "moneyness", "holdingPeriod", "risk", "minYield", "takeProfit", "stopLoss", "maxPosition", "assignmentHandling"} {
		if errs[field] == "" {
			t.Errorf("expected an error for %s", field)
		}
	}
	if errs["name"] != "" {
		t.Errorf("name should be valid, got %q", errs["name"])
	}
	if errs := validInput().Validate(); len(errs) != 0 {
		t.Errorf("valid input reported errors: %v", errs)
	}
}

func TestReopenKeepsDataAndSchema(t *testing.T) {
	path := filepath.Join(t.TempDir(), "persist.db")
	db, err := store.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := NewRepository(db).Create(context.Background(), validInput()); err != nil {
		t.Fatal(err)
	}
	db.Close()

	db, err = store.Open(path) // migrations must not re-run
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	list, err := NewRepository(db).List(context.Background())
	if err != nil || len(list) != 1 {
		t.Errorf("after reopen: %v, %v", list, err)
	}
}
