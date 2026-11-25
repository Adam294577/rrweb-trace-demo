package main

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"rrweb-trace/server/config"
	"rrweb-trace/server/routes"
	"rrweb-trace/server/services"
)

func main() {
	// 沒有 .env 是正常情況（模擬模式）；格式錯誤則不印原始錯誤，避免帶出內容
	if err := godotenv.Load(); err != nil && !errors.Is(err, fs.ErrNotExist) {
		log.Fatal("server/.env 讀取失敗，請檢查格式")
	}
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		log.Fatalf("設定錯誤：%v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	addr := fmt.Sprintf("127.0.0.1:%d", cfg.APIPort)
	if cfg.Simulated() {
		log.Printf("寄信服務 http://%s（模擬模式：未設定 SMTP，不會真的寄出）", addr)
	} else {
		log.Printf("寄信服務 http://%s（真實寄信：%s → %s）", addr, cfg.SMTPUser, cfg.MailTo)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           routes.Setup(services.NewMailer(cfg, os.Stdout)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
	}
	log.Fatal(srv.ListenAndServe())
}
