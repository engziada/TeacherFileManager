import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { School, Shield, Cloud, CheckCircle } from "lucide-react";

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = () => {
    setIsLoading(true);
    window.location.href = '/api/google-signup';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center">
            <School className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">نظام إدارة ملفات الطلاب</CardTitle>
          <CardDescription>
            إنشاء حساب جديد للمعلم
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Cloud className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-blue-800">لماذا نحتاج حساب Google Drive؟</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>حفظ ملفات الطلاب في حسابك الشخصي</li>
                  <li>إنشاء مجلدات تلقائياً لكل طالب</li>
                  <li>مشاركة آمنة مع أولياء الأمور</li>
                  <li>نسخ احتياطي تلقائي لجميع الملفات</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Cloud className="h-5 w-5 ml-2" />
              {isLoading ? "جاري التوجيه إلى Google..." : "إنشاء حساب باستخدام Google Drive"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <a href="/teacher-login" className="text-blue-600 hover:text-blue-800 underline">
                  تسجيل الدخول
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
                  <li>نحن لا نحفظ ملفاتك على خوادمنا</li>
                  <li>جميع الملفات تبقى في حساب Google Drive الخاص بك</li>
                  <li>يمكنك إلغاء الوصول في أي وقت من إعدادات Google</li>
                  <li>نستخدم بروتوكولات الأمان المعتمدة من Google</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}