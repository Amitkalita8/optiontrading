package users

import (
	"strings"
	"testing"
)

func TestPasswords(t *testing.T) {
	h := HashPassword("correct horse")
	if !strings.HasPrefix(h, "$2") {
		t.Fatalf("hash %q is not bcrypt", h)
	}
	if h == HashPassword("correct horse") {
		t.Error("bcrypt hashes should be salted (differ each time)")
	}
	if ok, up := CheckPassword(h, "correct horse"); !ok || up {
		t.Errorf("bcrypt check = %v, %v; want true, false", ok, up)
	}
	if ok, _ := CheckPassword(h, "wrong"); ok {
		t.Error("wrong password accepted")
	}

	// Hashes stored before bcrypt still work and ask to be upgraded.
	legacy := legacyHash("old secret")
	if ok, up := CheckPassword(legacy, "old secret"); !ok || !up {
		t.Errorf("legacy check = %v, %v; want true, true", ok, up)
	}
	if ok, up := CheckPassword(legacy, "nope"); ok || up {
		t.Error("wrong password accepted for a legacy hash")
	}

	// No password stored: nothing matches, not even "".
	for _, none := range []string{"", legacyHash("")} {
		if HasPassword(none) {
			t.Errorf("HasPassword(%q) = true", none)
		}
		if ok, _ := CheckPassword(none, ""); ok {
			t.Errorf("empty password accepted for %q", none)
		}
	}

	// Over bcrypt's 72-byte limit.
	long := strings.Repeat("x", 100)
	if ok, _ := CheckPassword(HashPassword(long), long); !ok {
		t.Error("long password rejected")
	}
	if ok, _ := CheckPassword(HashPassword(long), long[:72]); ok {
		t.Error("long password matched its first 72 bytes")
	}
}
