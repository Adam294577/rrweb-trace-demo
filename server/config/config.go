package config

import (
	"fmt"
	"net/mail"
	"strconv"
	"strings"
)

type Config struct {
	APIPort  int
	MailTo   string
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
}

// Simulated 帳密都沒填時只模擬寄信，不連網
func (c Config) Simulated() bool {
	return c.SMTPUser == "" && c.SMTPPass == ""
}

// Load 設定不完整就回錯誤，不會默默退回模擬模式
func Load(getenv func(string) string) (Config, error) {
	get := func(key, fallback string) string {
		if v := strings.TrimSpace(getenv(key)); v != "" {
			return v
		}
		return fallback
	}

	cfg := Config{
		MailTo:   get("MAIL_TO", ""),
		SMTPHost: get("SMTP_HOST", "smtp.gmail.com"),
		SMTPUser: get("SMTP_USER", ""),
		SMTPPass: get("SMTP_PASS", ""),
	}
	// Google 顯示應用程式密碼時每 4 碼有空格，直接貼上也要能用
	if cfg.SMTPHost == "smtp.gmail.com" {
		cfg.SMTPPass = strings.ReplaceAll(cfg.SMTPPass, " ", "")
	}

	var err error
	if cfg.APIPort, err = port("API_PORT", get("API_PORT", "8787")); err != nil {
		return Config{}, err
	}
	if cfg.SMTPPort, err = port("SMTP_PORT", get("SMTP_PORT", "587")); err != nil {
		return Config{}, err
	}

	if cfg.Simulated() {
		return cfg, nil
	}
	for _, item := range []struct{ key, value string }{
		{"SMTP_USER", cfg.SMTPUser}, {"SMTP_PASS", cfg.SMTPPass}, {"MAIL_TO", cfg.MailTo},
	} {
		if item.value == "" {
			return Config{}, fmt.Errorf("缺少環境變數 %s", item.key)
		}
	}
	for _, item := range []struct{ key, value string }{{"SMTP_USER", cfg.SMTPUser}, {"MAIL_TO", cfg.MailTo}} {
		if _, err := mail.ParseAddress(item.value); err != nil {
			return Config{}, fmt.Errorf("環境變數 %s 不是有效的 Email", item.key)
		}
	}
	return cfg, nil
}

func port(key, value string) (int, error) {
	n, err := strconv.Atoi(value)
	if err != nil || n < 1 || n > 65535 {
		return 0, fmt.Errorf("環境變數 %s 不是有效的連接埠", key)
	}
	return n, nil
}
