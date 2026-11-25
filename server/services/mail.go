package services

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/wneessen/go-mail"

	"rrweb-trace/server/config"
)

const sendTimeout = 10 * time.Second

// Submission 使用者輸入的內容，刻意沒有密碼欄位
type Submission struct {
	ID       string
	Name     string
	Email    string
	Phone    string
	Category string
	Remark   string
}

// Mailer 寄信介面，Mode 供前端分辨是真的寄出或模擬
type Mailer interface {
	Send(ctx context.Context, s Submission) error
	Mode() string
}

func NewMailer(cfg config.Config, out io.Writer) Mailer {
	if cfg.Simulated() {
		return &simulatedMailer{to: cfg.MailTo, out: out}
	}
	return &smtpMailer{cfg: cfg}
}

// Compose 組純文字信件，兩種模式共用
func Compose(s Submission) (subject, body string) {
	remark := s.Remark
	if remark == "" {
		remark = "（無）"
	}
	subject = fmt.Sprintf("[rrweb demo] 新表單 %s", s.ID)
	body = fmt.Sprintf("收到一筆新的表單：\n\n單號：%s\n姓名：%s\nEmail：%s\n手機：%s\n類別：%s\n備註：%s\n",
		s.ID, s.Name, s.Email, s.Phone, s.Category, remark)
	return subject, body
}

type simulatedMailer struct {
	to  string
	out io.Writer
}

func (m *simulatedMailer) Mode() string { return "simulated" }

func (m *simulatedMailer) Send(_ context.Context, s Submission) error {
	subject, body := Compose(s)
	_, err := fmt.Fprintf(m.out, "\n----- 模擬寄信（未真的寄出）-----\n收件人：%s\n主旨：%s\n\n%s---------------------------------\n",
		m.to, subject, body)
	return err
}

type smtpMailer struct {
	cfg config.Config
}

func (m *smtpMailer) Mode() string { return "sent" }

func (m *smtpMailer) Send(ctx context.Context, s Submission) error {
	ctx, cancel := context.WithTimeout(ctx, sendTimeout)
	defer cancel()

	msg := mail.NewMsg()
	if err := msg.From(m.cfg.SMTPUser); err != nil {
		return err
	}
	if err := msg.To(m.cfg.MailTo); err != nil {
		return err
	}
	subject, body := Compose(s)
	msg.Subject(subject)
	msg.SetBodyString(mail.TypeTextPlain, body)

	opts := []mail.Option{
		mail.WithPort(m.cfg.SMTPPort),
		mail.WithSMTPAuth(mail.SMTPAuthPlain),
		mail.WithUsername(m.cfg.SMTPUser),
		mail.WithPassword(m.cfg.SMTPPass),
		mail.WithTLSPolicy(mail.TLSMandatory),
		mail.WithTimeout(sendTimeout),
	}
	// 465 是一連線就加密，587 是連線後升級加密
	if m.cfg.SMTPPort == mail.DefaultPortSSL {
		opts = append(opts, mail.WithSSL())
	}
	client, err := mail.NewClient(m.cfg.SMTPHost, opts...)
	if err != nil {
		return err
	}
	return client.DialAndSendWithContext(ctx, msg)
}
