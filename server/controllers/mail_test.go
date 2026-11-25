package controllers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"rrweb-trace/server/routes"
	"rrweb-trace/server/services"
)

type fakeMailer struct {
	err  error
	sent []services.Submission
}

func (f *fakeMailer) Mode() string { return "sent" }
func (f *fakeMailer) Send(_ context.Context, s services.Submission) error {
	f.sent = append(f.sent, s)
	return f.err
}

const valid = `{"id":"F1","name":"王小明","email":"a@b.co","phone":"0912345678","category":"報修","remark":"","password":"secret","to":"evil@example.com"}`

func post(m services.Mailer, contentType, body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	req := httptest.NewRequest(http.MethodPost, "/api/mail", strings.NewReader(body))
	req.Header.Set("Content-Type", contentType)
	w := httptest.NewRecorder()
	routes.Setup(m).ServeHTTP(w, req)
	return w
}

func TestSendOK(t *testing.T) {
	m := &fakeMailer{}
	w := post(m, "application/json", valid)
	if w.Code != 200 || w.Body.String() != `{"mode":"sent"}` || len(m.sent) != 1 || m.sent[0].Name != "王小明" {
		t.Fatal(w.Code, w.Body.String(), m.sent)
	}
}

func TestSendRejected(t *testing.T) {
	cases := []struct {
		name, contentType, body string
		code                    int
	}{
		{"非 JSON 類型", "text/plain", valid, 415},
		{"JSON 損毀", "application/json", "{", 400},
		{"缺欄位", "application/json", `{"id":"F1"}`, 400},
		{"單號夾帶換行", "application/json", strings.Replace(valid, `"F1"`, `"F1\r\nBcc: x"`, 1), 400},
		{"備註過長", "application/json", strings.Replace(valid, `"remark":""`, `"remark":"`+strings.Repeat("字", 1001)+`"`, 1), 400},
		{"內容過大", "application/json", `{"x":"` + strings.Repeat("a", 20<<10) + `"}`, 400},
	}
	for _, tc := range cases {
		m := &fakeMailer{}
		if w := post(m, tc.contentType, tc.body); w.Code != tc.code || len(m.sent) != 0 {
			t.Errorf("%s: code=%d sent=%d", tc.name, w.Code, len(m.sent))
		}
	}
}

func TestSendFailureHidesDetail(t *testing.T) {
	w := post(&fakeMailer{err: errors.New("535 user@example.com")}, "application/json", valid)
	if w.Code != 502 || strings.Contains(w.Body.String(), "535") {
		t.Fatal(w.Code, w.Body.String())
	}
}
