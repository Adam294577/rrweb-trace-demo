package services

import (
	"bytes"
	"context"
	"net"
	"strings"
	"testing"

	"rrweb-trace/server/config"
)

var sample = Submission{ID: "F1", Name: "王小明", Email: "a@b.co", Phone: "0912345678", Category: "報修", Remark: "第一行\n第二行"}

func TestCompose(t *testing.T) {
	subject, body := Compose(sample)
	if !strings.Contains(subject, "F1") {
		t.Error(subject)
	}
	for _, want := range []string{"F1", "王小明", "a@b.co", "0912345678", "報修", "第一行\n第二行"} {
		if !strings.Contains(body, want) {
			t.Errorf("缺少 %q", want)
		}
	}
	if _, body := Compose(Submission{}); !strings.Contains(body, "備註：（無）") {
		t.Error("空備註應顯示（無）")
	}
}

func TestSimulatedMailer(t *testing.T) {
	var out bytes.Buffer
	m := NewMailer(config.Config{MailTo: "to@example.com"}, &out)
	if err := m.Send(context.Background(), sample); err != nil {
		t.Fatal(err)
	}
	if m.Mode() != "simulated" || !strings.Contains(out.String(), "王小明") || !strings.Contains(out.String(), "to@example.com") {
		t.Error(out.String())
	}
}

// 不連外：連到本機已關閉的埠，確認會回錯誤
func TestSMTPMailerConnectionError(t *testing.T) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	port := l.Addr().(*net.TCPAddr).Port
	l.Close()
	m := NewMailer(config.Config{MailTo: "to@example.com", SMTPHost: "127.0.0.1", SMTPPort: port, SMTPUser: "a@example.com", SMTPPass: "x"}, nil)
	if m.Mode() != "sent" {
		t.Error(m.Mode())
	}
	if err := m.Send(context.Background(), sample); err == nil {
		t.Error("連線失敗應回錯誤")
	}
}
