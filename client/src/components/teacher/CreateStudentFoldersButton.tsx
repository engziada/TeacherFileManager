import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FolderPlus, CheckCircle, AlertCircle } from "lucide-react";
import type { Teacher, Student } from "@shared/schema";

interface CreateStudentFoldersButtonProps {
  teacher: Teacher;
  teacherId: number;
}

interface FolderCreationResult {
  success: boolean;
  created: number;
  failed: number;
  skipped: number;
  total: number;
  message: string;
  details: string[];
  note?: string;
}

export default function CreateStudentFoldersButton({ teacher, teacherId }: CreateStudentFoldersButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FolderCreationResult | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pre-fetch students to know if we have any eligible ones before hitting the API
  const { data: students } = useQuery<Student[]>({
    queryKey: [`/api/teacher/${teacherId}/students`],
  });

  const studentsList = students ?? [];
  // storage.getStudentsByTeacher already filters active students; ensure not already created
  const eligibleCount = studentsList.filter((s) => !s.folderCreated).length;
  const noEligible = eligibleCount === 0;

  const createFoldersMutation = useMutation({
    mutationFn: async () => {
      setIsCreating(true);
      setProgress(0);
      setResult(null);

      // Improved progress tracking - faster updates to match server progress
      let progressUpdates = 0;
      const progressInterval = setInterval(() => {
        progressUpdates += Math.floor(Math.random() * 4) + 2; // 2-5% increment
        if (progressUpdates <= 95) {
          setProgress(progressUpdates);
        }
      }, 800); // Update every 800ms for smoother progress

      try {
        const response = await apiRequest('POST', `/api/teacher/${teacherId}/create-student-folders`);
        clearInterval(progressInterval);
        setProgress(100);
        return response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data: FolderCreationResult) => {
      setResult(data);
      setProgress(100);
      
      if (data.success) {
        toast({
          title: "تم تجهيز المجلدات بنجاح",
          description: data.message || `تم تجهيز ${data.created} مجلد للطلاب`,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/teacher/${teacherId}/students`] });
      }
    },
    onError: (error) => {
      console.error("Error creating folders:", error);
      const msg = error instanceof Error ? error.message : "";

      // Handle common 400 cases gracefully with informative toasts
      if (msg.includes("No new students found")) {
        toast({
          title: "لا يوجد طلاب جدد",
          description: "أضِف طلاباً نشطين قبل إنشاء المجلدات",
        });
        setResult(null);
        return;
      }
      if (msg.includes("Google Drive folder not configured")) {
        toast({
          title: "مجلد Google Drive غير مُعد",
          description: "قم بربط/حفظ رابط مجلد Google Drive أولاً",
          variant: "destructive",
        });
        setResult(null);
        return;
      }

      // Fallback error
      toast({
        title: "خطأ في إنشاء المجلدات",
        description: "فشل في إنشاء مجلدات الطلاب. تأكد من الاتصال بـ Google Drive",
        variant: "destructive",
      });
      setResult({
        success: false,
        created: 0,
        failed: 1,
        skipped: 0,
        total: 0,
        message: "فشل في إنشاء المجلدات",
        details: ["فشل في الاتصال بـ Google Drive"],
      });
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  const handleCreateFolders = () => {
    if (noEligible) {
      toast({
        title: "لا يوجد طلاب",
        description: "أضِف طلاباً أولاً قبل إنشاء المجلدات",
      });
      return;
    }
    createFoldersMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">إنشاء مجلدات الطلاب</h3>
          <p className="text-xs text-muted-foreground">
            إنشاء مجلد منفصل لكل طالب في Google Drive
          </p>
        </div>
        
        <Button 
          onClick={handleCreateFolders}
          disabled={isCreating || !teacher.driveFolderId || noEligible}
          size="sm"
        >
          <FolderPlus className="h-4 w-4 ml-2" />
          {isCreating ? "جاري الإنشاء..." : "إنشاء مجلدات الطلاب"}
        </Button>
      </div>

      {isCreating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>جاري إنشاء المجلدات...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {result && (
        <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription>
            {result.success ? (
              <div>
                <p className="font-medium text-green-800">
                  {result.message}
                </p>
                <div className="text-sm text-green-700 mt-2 space-y-1">
                  <p>• عدد الطلاب الإجمالي: {result.total}</p>
                  <p>• تم تجهيز: {result.created} مجلد</p>
                  {result.skipped > 0 && <p>• تم تخطي: {result.skipped} مجلد موجود مسبقاً</p>}
                  {result.failed > 0 && <p>• فشل: {result.failed} مجلد</p>}
                </div>
                {result.note && (
                  <p className="text-xs text-green-600 mt-2 italic">
                    {result.note}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium text-red-800">فشل في إنشاء المجلدات</p>
                {result.details.length > 0 && (
                  <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                    {result.details.slice(0, 3).map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                    {result.details.length > 3 && (
                      <li>وأخطاء أخرى...</li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!teacher.driveFolderId && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            يجب ربط مجلد Google Drive أولاً قبل إنشاء مجلدات الطلاب
          </AlertDescription>
        </Alert>
      )}

      {noEligible && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            لا يوجد طلاب نشطون بدون مجلدات. أضِف طلاباً أولاً ثم حاول مرة أخرى.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}