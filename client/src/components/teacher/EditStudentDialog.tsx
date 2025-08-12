import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@shared/schema";

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: number;
  teacherSubjects: { id: number; nameAr: string }[];
}

export default function EditStudentDialog({
  student,
  open,
  onOpenChange,
  teacherId,
  teacherSubjects,
}: EditStudentDialogProps) {
  const [formData, setFormData] = useState({
    studentName: "",
    grade: "",
    classNumber: "",
    subjects: [] as string[],
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: studentSubjects = [] as string[] } = useQuery({
    queryKey: student ? [`/api/student/${student.id}/subjects`] : [],
    enabled: !!student,
    queryFn: async () => {
      if (!student) return [];
      const res = await fetch(`/api/student/${student.id}/subjects`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تحميل المواد');
      return res.json();
    }
  });

  useEffect(() => {
    if (student) {
      setFormData({
        studentName: student.studentName,
        grade: student.grade,
        classNumber: String(student.classNumber),
        subjects: studentSubjects,
      });
    }
  }, [student, studentSubjects]);

  const [deleteRemovedSubjectFolders, setDeleteRemovedSubjectFolders] = useState(false);
  const [removedSubjects, setRemovedSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (student && studentSubjects.length > 0) {
      const currentSubjects = studentSubjects;
      const newSubjects = formData.subjects;
      const removed = currentSubjects.filter(subject => !newSubjects.includes(subject));
      setRemovedSubjects(removed);
    }
  }, [formData.subjects, studentSubjects]);

  const updateStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!student) throw new Error("No student selected");
      
      const response = await fetch(`/api/student/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          deleteRemovedSubjectFolders
        }),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل تحديث بيانات الطالب");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/students`] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الطالب بنجاح",
      });
      setDeleteRemovedSubjectFolders(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل تحديث بيانات الطالب",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = async () => {
    if (!student) return;
    
    setIsCreatingFolder(true);
    try {
      const response = await fetch(`/api/student/${student.id}/folder`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "نجحت العملية",
          description: data.message,
        });
      } else {
        if (response.status === 400 && data.message === "مجلد الطالب موجود مسبقاً") {
          throw new Error("هذا المجلد موجود مسبقاً. لا يمكن إنشاء مجلد مكرر.");
        }
        throw new Error(data.message || "فشل إنشاء مجلد الطالب");
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل إنشاء المجلد",
        variant: "destructive",
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudentMutation.mutate(formData);
  };

  const handleSubjectChange = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الطالب</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الرقم المدني</Label>
            <Input value={student.civilId} disabled className="bg-gray-100" />
            <p className="text-xs text-gray-500 mt-1">لا يمكن تعديل الرقم المدني</p>
          </div>

          <div>
            <Label htmlFor="studentName">اسم الطالب</Label>
            <Input
              id="studentName"
              value={formData.studentName}
              onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="grade">الصف</Label>
            <Select
              value={formData.grade}
              onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الصف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="الأول">الأول</SelectItem>
                <SelectItem value="الثاني">الثاني</SelectItem>
                <SelectItem value="الثالث">الثالث</SelectItem>
                <SelectItem value="الرابع">الرابع</SelectItem>
                <SelectItem value="الخامس">الخامس</SelectItem>
                <SelectItem value="السادس">السادس</SelectItem>
                <SelectItem value="السابع">السابع</SelectItem>
                <SelectItem value="الثامن">الثامن</SelectItem>
                <SelectItem value="التاسع">التاسع</SelectItem>
                <SelectItem value="العاشر">العاشر</SelectItem>
                <SelectItem value="الحادي عشر">الحادي عشر</SelectItem>
                <SelectItem value="الثاني عشر">الثاني عشر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="classNumber">رقم الفصل</Label>
            <Input
              id="classNumber"
              value={formData.classNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, classNumber: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label>المواد</Label>
            <div className="space-y-2 mt-2">
              {teacherSubjects.map((subject) => (
                <label key={subject.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.subjects.includes(subject.nameAr)}
                    onChange={() => handleSubjectChange(subject.nameAr)}
                    className="rounded border-gray-300"
                  />
                  <span>{subject.nameAr}</span>
                </label>
              ))}
            </div>
          </div>

          {removedSubjects.length > 0 && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-red-600">
                تنبيه: تم إزالة المواد التالية
              </Label>
              <div className="text-sm text-gray-600 mt-1">
                {removedSubjects.join("، ")}
              </div>
              <label className="flex items-center space-x-2 mt-2">
                <input
                  type="checkbox"
                  checked={deleteRemovedSubjectFolders}
                  onChange={(e) => setDeleteRemovedSubjectFolders(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">
                  حذف مجلدات المواد المزالة من Google Drive
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                سيتم حذف مجلدات المواد المزالة نهائيًا من Google Drive
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateFolder}
              disabled={isCreatingFolder}
              className="w-full"
            >
              {isCreatingFolder ? "جاري الإنشاء..." : "إنشاء مجلد الطالب"}
            </Button>
            <p className="text-xs text-gray-500 mt-1 text-center">
              إنشاء مجلد خاص بالطالب لتخزين الملفات
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={updateStudentMutation.isPending}
              className="flex-1"
            >
              {updateStudentMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
