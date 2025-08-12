import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { Upload, School, FileSpreadsheet, Plus, X, Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TeacherSessionManager } from "@/lib/teacherSession";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Subject {
  id: number;
  nameAr: string;
}

export default function TeacherOnboarding() {
  const [step, setStep] = useState(1);
  const [schoolName, setSchoolName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Get teacherId from URL query parameters
  const teacherId = (() => {
    try {
      // Use window.location.search to get query parameters
      const params = new URLSearchParams(window.location.search);
      const urlTeacherId = params.get('teacherId');
      
      // If no teacherId in URL, try to get from current session
      if (!urlTeacherId) {
        const session = TeacherSessionManager.getSession();
        if (session?.teacherId) {
          return session.teacherId.toString();
        }
      }
      
      return urlTeacherId || '';
    } catch {
      return '';
    }
  })();

  // Load available subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetch('/api/subjects');
        if (response.ok) {
          const data = await response.json();
          setAvailableSubjects(data);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء جلب قائمة المواد",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  const handleSaveOnboarding = async () => {
    try {
      setIsLoading(true);
      
      if (!schoolName.trim() || selectedSubjects.length === 0) {
        toast({
          title: "بيانات ناقصة",
          description: "يرجى إدخال اسم المدرسة واختيار مادة واحدة على الأقل",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!teacherId) {
        toast({
          title: "خطأ في تحديد الحساب",
          description: "لم يتم العثور على معرف المعلم. يرجى تسجيل الدخول مرة أخرى عبر Google.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      console.log('Saving onboarding data for teacher:', teacherId);

      const subjectNames = selectedSubjects.map(s => s.nameAr);

      const response = await apiRequest(
        'POST',
        `/api/teacher/${teacherId}/onboarding`,
        {
          schoolName: schoolName.trim(),
          subjectNames,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Onboarding saved successfully:', result);
      

      // Update session with the new teacher data
      if (result.teacher) {
        const session = {
          teacherId: result.teacher.id,
          googleId: result.teacher.googleId,
          name: result.teacher.name,
          email: result.teacher.email,
          schoolName: result.teacher.schoolName,
          linkCode: result.teacher.linkCode,
          lastAccess: new Date().toISOString(),
          profileComplete: result.teacher.profileComplete
        };
        TeacherSessionManager.saveSession(session);
      }

      toast({
        title: "تم حفظ البيانات",
        description: "اكتمل الإعداد الأولي للحساب",
      });
      
      // Small delay to ensure toast is shown, then redirect
      setTimeout(() => {
        console.log('Redirecting to dashboard:', `/teacher-dashboard/${teacherId}`);
        setLocation(`/teacher-dashboard/${teacherId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error('Onboarding save error:', error);
      
      let errorMessage = "يرجى المحاولة مرة أخرى";
      if (error.message?.includes('404')) {
        errorMessage = "لم يتم العثور على الحساب. يرجى تسجيل الدخول مرة أخرى.";
      } else if (error.message?.includes('400')) {
        errorMessage = "بيانات غير صحيحة. يرجى التحقق من البيانات المدخلة.";
      }
      
      toast({
        title: "خطأ في حفظ البيانات",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToUpload = () => {
    setStep(3);
  };

  const handleSkipToManual = () => {
    if (teacherId) {
      setLocation(`/teacher-dashboard/${teacherId}`);
    } else {
      setLocation("/teacher-dashboard/1");
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-16 h-16 flex items-center justify-center">
              <School className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold">مرحباً بك في نظام إدارة ملفات الطلاب</CardTitle>
            <CardDescription>
              لبدء استخدام النظام، يرجى إدخال بياناتك الأساسية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">اسم المدرسة</Label>
              <Input
                id="schoolName"
                type="text"
                placeholder="أدخل اسم المدرسة"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="text-right"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <Label>المواد الدراسية</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedSubjects.map((subject) => (
                  <Badge key={subject.id} variant="secondary" className="text-sm">
                    {subject.nameAr}
                    <button
                      type="button"
                      onClick={() => setSelectedSubjects(selectedSubjects.filter(s => s.id !== subject.id))}
                      className="mr-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Popover open={isSubjectDropdownOpen} onOpenChange={setIsSubjectDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSubjectDropdownOpen}
                    className="w-full justify-between"
                  >
                    {newSubject || "اختر المادة..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="ابحث عن مادة..."
                      value={newSubject}
                      onValueChange={setNewSubject}
                      className="h-9"
                    />
                    <CommandEmpty>
                      <div className="p-2 text-sm text-gray-500">
                        {newSubject ? (
                          <button
                            onClick={() => {
                              const newSub = { id: Date.now(), nameAr: newSubject };
                              setSelectedSubjects([...selectedSubjects, newSub]);
                              setNewSubject('');
                              setIsSubjectDropdownOpen(false);
                            }}
                            className="w-full text-right p-2 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4 ml-2 inline" />
                            إنشاء مادة جديدة: {newSubject}
                          </button>
                        ) : (
                          "لا توجد نتائج"
                        )}
                      </div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {availableSubjects
                        .filter(
                          (subject) =>
                            !selectedSubjects.some((s) => s.id === subject.id) &&
                            subject.nameAr.includes(newSubject)
                        )
                        .map((subject) => (
                          <CommandItem
                            key={subject.id}
                            onSelect={() => {
                              setSelectedSubjects([...selectedSubjects, subject]);
                              setNewSubject('');
                              setIsSubjectDropdownOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            {subject.nameAr}
                            <Check
                              className={cn(
                                "mr-auto h-4 w-4",
                                selectedSubjects.some((s) => s.id === subject.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleSaveOnboarding}
              disabled={!schoolName.trim() || selectedSubjects.length === 0 || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "جاري الحفظ..." : "حفظ البيانات والمتابعة"}
            </Button>

            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-xs text-green-700 dark:text-green-300 text-center">
                ✅ تم ربط حساب Google Drive تلقائياً عند تسجيل الدخول. ستتمكن من إنشاء مجلدات الطلاب مباشرة في حسابك.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-16 h-16 flex items-center justify-center">
              <Upload className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">تم ربط حسابك بنجاح!</CardTitle>
            <CardDescription>
              الآن يمكنك رفع بيانات الطلاب لبدء استخدام النظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleContinueToUpload}
              className="w-full"
              size="lg"
            >
              <FileSpreadsheet className="ml-2 h-4 w-4" />
              رفع ملف Excel للطلاب
            </Button>

            <Button
              onClick={handleSkipToManual}
              variant="outline"
              className="w-full"
              size="lg"
            >
              تخطي وإضافة الطلاب يدوياً
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              يمكنك رفع ملف Excel يحتوي على بيانات الطلاب أو إضافتهم يدوياً لاحقاً
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-16 h-16 flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-2xl font-bold">رفع بيانات الطلاب</CardTitle>
            <CardDescription>
              ارفع ملف Excel يحتوي على بيانات الطلاب لإنشاء ملفاتهم تلقائياً
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                اسحب وأفلت ملف Excel هنا أو اضغط للاختيار
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="excel-upload"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    // Handle file upload
                    const teacherId = localStorage.getItem('teacherId');
                    if (teacherId) {
                      setLocation(`/teacher-dashboard/${teacherId}`);
                    } else {
                      setLocation("/teacher-dashboard/1");
                    }
                  }
                }}
              />
              <Button asChild>
                <label htmlFor="excel-upload" className="cursor-pointer">
                  اختيار ملف Excel
                </label>
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">أو</p>
              <Button
                onClick={handleSkipToManual}
                variant="outline"
                className="w-full"
              >
                إضافة الطلاب يدوياً
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}