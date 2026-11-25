package controllers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"rrweb-trace/server/services"
)

const maxBody = 16 << 10

// 欄位白名單：收件人不開放指定，也不收密碼
type mailRequest struct {
	ID       string `json:"id" binding:"required,alphanum,max=32"`
	Name     string `json:"name" binding:"required,max=50"`
	Email    string `json:"email" binding:"required,contains=@,max=254"`
	Phone    string `json:"phone" binding:"required,numeric,max=10"`
	Category string `json:"category" binding:"required,max=20"`
	Remark   string `json:"remark" binding:"max=1000"`
}

type MailController struct {
	mailer services.Mailer
}

func NewMailController(mailer services.Mailer) *MailController {
	return &MailController{mailer: mailer}
}

func (mc *MailController) Send(c *gin.Context) {
	// 只收 JSON：其他網站的跨來源請求會被瀏覽器的預檢擋下
	if c.ContentType() != gin.MIMEJSON {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"message": "只接受 JSON"})
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBody)

	var req mailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "寄信內容格式錯誤"})
		return
	}

	err := mc.mailer.Send(c.Request.Context(), services.Submission{
		ID: req.ID, Name: req.Name, Email: req.Email, Phone: req.Phone, Category: req.Category, Remark: req.Remark,
	})
	if err != nil {
		// 細節只留在終端機
		log.Printf("寄信失敗 單號=%s：%v", req.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"message": "郵件伺服器寄送失敗"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"mode": mc.mailer.Mode()})
}
