import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, UserPlus, Users, Download } from "lucide-react";
import { teacherApi } from "@/lib/api";
import StudentDeleteActions from "@/components/teacher/StudentDeleteActions";
import EditStudentDialog from "@/components/teacher/EditStudentDialog";

interface StudentManagementProps {
  teacherId: number;
  onStudentSelect?: (civilId: string) => void;
}

import type { Student } from "@shared/schema";

export default function StudentManagement({ teacherId, onStudentSelect }: StudentManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    civilId: "",
    studentName: "",
    grade: "",
    classNumber: "",
    subjects: [] as string[]
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const [isCreatingFolder, setIsCreatingFolder] = useState<number | null>(null);

  const handleCreateFolder = async (studentId: number, civilId: string) => {
    setIsCreatingFolder(studentId);
    try {
      const response = await fetch(`/api/student/${studentId}/folder`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "نجحت العملية",
          description: data.message,
          variant: "default"
        });
      } else {
        throw new Error(data.message || "فشل إنشاء مجلد الطالب");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setIsCreatingFolder(null);
    }
  };

  const { data: students = [] as Student[], isLoading } = useQuery<Student[]>({
    queryKey: [`/api/teacher/${teacherId}/students`],
    enabled: !!teacherId
  });

  // Fetch teacher subjects (Arabic names)
  const { data: teacherSubjects = [] as { id: number; nameAr: string }[] } = useQuery({
    queryKey: [`/api/teacher/${teacherId}/subjects`],
    enabled: !!teacherId,
    queryFn: async () => {
      const res = await fetch(`/api/teacher/${teacherId}/subjects`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تحميل المواد');
      return res.json();
    }
  });

  const addStudentMutation = useMutation({
    mutationFn: async (studentData: any) => {
      const response = await fetch(`/api/teacher/${teacherId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData),
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'فشل إضافة الطالب');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/students`] });
      setNewStudent({ civilId: "", studentName: "", grade: "", classNumber: "", subjects: [] });
      setShowAddForm(false);
      toast({
        title: "تم إضافة الطالب بنجاح",
        description: "تم إنشاء ملف جديد للطالب"
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في إضافة الطالب",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  });

  const uploadExcelMutation = useMutation({
    mutationFn: (file: File) => teacherApi.uploadExcel(teacherId, file, setUploadProgress),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/students`] });
      setShowUploadForm(false);
      setUploadProgress(0);
      toast({
        title: "تم رفع الملف بنجاح",
        description: `تم إضافة ${result.added} طالب. ${result.skipped > 0 ? `تم تجاهل ${result.skipped} صف.` : ''}`
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "خطأ في رفع الملف",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  });

  const handleAddStudent = () => {
    if (!newStudent.civilId || !newStudent.studentName || !newStudent.grade || !newStudent.classNumber || newStudent.subjects.length === 0) {
      toast({
        title: "بيانات ناقصة",
        description: "يرجى ملء جميع الحقول المطلوبة واختيار مادة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    addStudentMutation.mutate({
      civilId: newStudent.civilId,
      studentName: newStudent.studentName,
      grade: newStudent.grade,
      classNumber: parseInt(newStudent.classNumber),
      subjects: newStudent.subjects,
      teacherId,
      isActive: true
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadExcelMutation.mutate(file);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">جاري تحميل بيانات الطلاب...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة الطلاب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline">
              <UserPlus className="ml-2 h-4 w-4" />
              إضافة طالب جديد
            </Button>
            <Button onClick={() => setShowUploadForm(!showUploadForm)} variant="outline">
              <Upload className="ml-2 h-4 w-4" />
              رفع ملف Excel
            </Button>
          </div>

          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>إضافة طالب جديد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="civilId">رقم الهوية المدنية</Label>
                    <Input
                      id="civilId"
                      value={newStudent.civilId}
                      onChange={(e) => setNewStudent({...newStudent, civilId: e.target.value})}
                      placeholder="10 أرقام"
                      maxLength={10}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentName">اسم الطالب</Label>
                    <Input
                      id="studentName"
                      value={newStudent.studentName}
                      onChange={(e) => setNewStudent({...newStudent, studentName: e.target.value})}
                      placeholder="الاسم الكامل"
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade">الصف</Label>
                    <Select value={newStudent.grade} onValueChange={(value: string) => setNewStudent({...newStudent, grade: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="الأول الابتدائي">الأول الابتدائي</SelectItem>
                        <SelectItem value="الثاني الابتدائي">الثاني الابتدائي</SelectItem>
                        <SelectItem value="الثالث الابتدائي">الثالث الابتدائي</SelectItem>
                        <SelectItem value="الرابع الابتدائي">الرابع الابتدائي</SelectItem>
                        <SelectItem value="الخامس الابتدائي">الخامس الابتدائي</SelectItem>
                        <SelectItem value="السادس الابتدائي">السادس الابتدائي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="classNumber">رقم الفصل</Label>
                    <Input
                      id="classNumber"
                      type="number"
                      value={newStudent.classNumber}
                      onChange={(e) => setNewStudent({...newStudent, classNumber: e.target.value})}
                      placeholder="1, 2, 3..."
                      min="1"
                      max="20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>المواد</Label>
                    {teacherSubjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2">
                        لا توجد مواد مرتبطة بحساب المعلم بعد.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {teacherSubjects.map((s: { id: number; nameAr: string }) => {
                          const checked = newStudent.subjects.includes(s.nameAr);
                          return (
                            <label key={s.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...newStudent.subjects, s.nameAr]
                                    : newStudent.subjects.filter((x) => x !== s.nameAr);
                                  setNewStudent({ ...newStudent, subjects: next });
                                }}
                              />
                              <span>{s.nameAr}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddStudent} disabled={addStudentMutation.isPending}>
                    {addStudentMutation.isPending ? "جاري الإضافة..." : "إضافة الطالب"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    إلغاء
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showUploadForm && (
            <Card>
              <CardHeader>
                <CardTitle>رفع ملف Excel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    اختر ملف Excel يحتوي على: اسم الطالب، رقم الهوية، الصف، رقم الفصل، المادة
                  </p>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📋 ملاحظة: سيتم إضافة الطلاب الجدد فقط. الطلاب الموجودين مسبقاً سيتم تجاهلهم لتجنب التكرار
                    </p>
                  </div>
                  <div className="flex justify-center mb-4">
                    <a 
                      href="/api/template/students" 
                      download="student_template.xlsx"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      تحميل نموذج فارغ
                    </a>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <Label htmlFor="excel-upload" className="cursor-pointer">
                    <Button asChild disabled={uploadExcelMutation.isPending}>
                      <span>اختيار ملف Excel</span>
                    </Button>
                  </Label>
                  {uploadProgress > 0 && (
                    <div className="mt-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{uploadProgress}%</p>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                  إلغاء
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الطلاب ({students?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {students && students.length > 0 ? (
            <StudentDeleteActions students={students} teacherId={teacherId} onEditStudent={setEditingStudent} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              لا توجد بيانات طلاب. قم بإضافة طلاب جدد أو رفع ملف Excel.
            </div>
          )}
        </CardContent>
      </Card>
      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
        teacherId={teacherId}
        teacherSubjects={teacherSubjects}
      />
    </div>
  );
}