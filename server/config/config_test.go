package config

import (
	"strings"
	"testing"
)

func load(env map[string]string) (Config, error) {
	return Load(func(k string) string { return env[k] })
}

func TestLoadSimulated(t *testing.T) {
	cfg, err := load(nil)
	if err != nil || !cfg.Simulated() || cfg.APIPort != 8787 || cfg.SMTPPort != 587 {
		t.Fatalf("cfg=%+v err=%v", cfg, err)
	}
}

func TestLoadSMTP(t *testing.T) {
	cfg, err := load(map[string]string{"MAIL_TO": "to@example.com", "SMTP_USER": "a@example.com", "SMTP_PASS": "abcd efgh"})
	if err != nil || cfg.Simulated() || cfg.SMTPPass != "abcdefgh" {
		t.Fatalf("simulated=%v err=%v", cfg.Simulated(), err)
	}
}

func TestLoadInvalid(t *testing.T) {
	cases := map[string]map[string]string{
		"SMTP_PASS": {"MAIL_TO": "to@example.com", "SMTP_USER": "a@example.com"},
		"SMTP_USER": {"MAIL_TO": "to@example.com", "SMTP_PASS": "x"},
		"MAIL_TO":   {"SMTP_USER": "a@example.com", "SMTP_PASS": "x"},
		"SMTP_PORT": {"SMTP_PORT": "abc"},
		"API_PORT":  {"API_PORT": "99999"},
	}
	for key, env := range cases {
		if _, err := load(env); err == nil || !strings.Contains(err.Error(), key) {
			t.Errorf("%s: err=%v", key, err)
		}
	}
	if _, err := load(map[string]string{"MAIL_TO": "bad", "SMTP_USER": "a@example.com", "SMTP_PASS": "x"}); err == nil {
		t.Error("無效收件人應報錯")
	}
}
