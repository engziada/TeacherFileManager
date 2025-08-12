import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Cloud, Shield, CheckCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function TeacherLogin() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Show OAuth errors (if any) from callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const reason = params.get('reason');
    if (error) {
      const isProd = import.meta.env.MODE === 'production';
      const baseMsg = error === 'invalid_oauth_state'
        ? 'حدث خطأ في عملية تسجيل الدخول عبر Google. الرجاء المحاولة مرة أخرى.'
        : 'فشل تسجيل الدخول عبر Google. الرجاء المحاولة مرة أخرى.';
      const msg = !isProd && reason
        ? `${baseMsg} (السبب: ${decodeURIComponent(reason)})`
        : baseMsg;
      toast({ title: 'خطأ في Google OAuth', description: msg, variant: 'destructive' });
      // Clean the query string
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
            <Cloud className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">تسجيل الدخول</CardTitle>
          <CardDescription>
            استخدم حساب Google Drive للدخول إلى النظام
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-blue-800">مزايا تسجيل الدخول بـ Google:</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>وصول مباشر لحساب Google Drive الخاص بك</li>
                  <li>أمان عالي بدون كلمات مرور إضافية</li>
                  <li>مزامنة تلقائية مع ملفاتك الشخصية</li>
                  <li>إدارة سهلة للصلاحيات من إعدادات Google</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              size="lg"
            >
              <FcGoogle className="h-5 w-5" />
              {isLoading ? "جاري التوجيه إلى Google..." : "تسجيل الدخول بـ Google Drive"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ليس لديك حساب؟{" "}
                <a href="/register" className="text-blue-600 hover:text-blue-800 underline">
                  إنشاء حساب جديد
                </a>
              </p>
            </div>
          </div>

          <Alert className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-green-800">الأمان والخصوصية</p>
                <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>نحن لا نحفظ كلمات المرور الخاصة بك</li>
                  <li>جميع البيانات محمية بتشفير Google</li>
                  <li>يمكنك إلغاء الوصول في أي وقت</li>
                  <li>لا نصل إلى ملفاتك الشخصية الأخرى</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button 
            variant="outline"
            onClick={() => setLocation('/')}
            className="w-full"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة للصفحة الرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}