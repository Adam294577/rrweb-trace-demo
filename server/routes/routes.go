package routes

import (
	"github.com/gin-gonic/gin"

	"rrweb-trace/server/controllers"
	"rrweb-trace/server/services"
)

func Setup(mailer services.Mailer) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	_ = r.SetTrustedProxies(nil)

	mail := controllers.NewMailController(mailer)
	r.Group("/api").POST("/mail", mail.Send)
	return r
}
