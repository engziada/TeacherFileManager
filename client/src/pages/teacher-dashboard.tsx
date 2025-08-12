import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";

import StatsOverview from "@/components/teacher/stats-overview";
import StudentManagement from "@/components/teacher/student-management";
import FileManagement from "@/components/teacher/file-management";
import FileUpload from "@/components/teacher/file-upload";
import CameraUpload from "@/components/teacher/camera-upload";
import ParentLinkGenerator from "@/components/teacher/parent-link-generator";
import GoogleDriveConnect from "@/components/teacher/GoogleDriveConnect";
import StudentFoldersList from "@/components/teacher/StudentFoldersList";
import CreateStudentFoldersButton from "@/components/teacher/CreateStudentFoldersButton";
import { useTeacher } from "@/hooks/use-teacher";
import { useTeacherAuth } from "@/hooks/useTeacherAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wrench } from "lucide-react";

export default function TeacherDashboard() {
  const { teacherId } = useParams();
  const [, setLocation] = useLocation();
  const { currentSession, logout } = useTeacherAuth();
  const { toast } = useToast();
  const currentTeacherId = currentSession?.teacherId || parseInt(teacherId || "1");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'files' | 'upload-files' | 'parent-links'>('overview');
  
  const { data: teacher, isLoading: teacherLoading } = useTeacher(currentTeacherId);

  const [isRepairing, setIsRepairing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle OAuth results and redirect to onboarding when requested or if profile is incomplete
  useEffect(() => {
    if (teacherLoading) return;
    const params = new URLSearchParams(window.location.search);
    const wantsOnboarding = params.get('onboarding') === '1';
    const googleConnected = params.get('google_connected') === 'true';
    const error = params.get('error');
    const connectedEmail = params.get('email');
    
    // Handle OAuth errors
    if (error) {
      switch (error) {
        case 'email_mismatch':
          const expectedEmail = params.get('expected');
          const providedEmail = params.get('provided');
          toast({
            title: "خطأ في ربط الحساب",
            description: `يجب استخدام نفس البريد الإلكتروني المسجل في النظام. المتوقع: ${expectedEmail}، المستخدم: ${providedEmail}`,
            variant: "destructive",
          });
          break;
        case 'missing_email_from_google':
          toast({
            title: "خطأ في ربط الحساب",
            description: "لم يتم الحصول على البريد الإلكتروني من حساب Google",
            variant: "destructive",
          });
          break;
        case 'teacher_not_found':
          toast({
            title: "خطأ في النظام",
            description: "لم يتم العثور على بيانات المعلم",
            variant: "destructive",
          });
          break;
        default:
          toast({
            title: "خطأ في ربط الحساب",
            description: "حدث خطأ أثناء ربط حساب Google Drive",
            variant: "destructive",
          });
      }
      // Clear error parameters from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Handle successful Google connection
    if (googleConnected && connectedEmail) {
      toast({
        title: "تم ربط الحساب بنجاح",
        description: `تم ربط حساب Google Drive: ${decodeURIComponent(connectedEmail)}`,
      });
      // Clear success parameters from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (!teacher) return;
    if (wantsOnboarding || teacher.profileComplete === false) {
      setLocation(`/teacher-onboarding?teacherId=${currentTeacherId}`);
    }
  }, [teacherLoading, teacher, currentTeacherId, setLocation]);

  const handleRepairFolders = async () => {
    setIsRepairing(true);
    try {
      const response = await fetch(`/api/teacher/${currentTeacherId}/folders/repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to repair folders');
      }

      const result = await response.json();
      toast({
        title: "تم الإصلاح",
        description: result.message,
      });
    } catch (error) {
      console.error('Error repairing folders:', error);
      toast({
        title: "خطأ",
        description: "فشل في إصلاح المجلدات",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRefreshConnection = async () => {
    setIsRefreshing(true);
    try {
      // Redirect to Google OAuth flow to refresh the connection
      window.location.href = `/api/teacher/${currentTeacherId}/connect-google`;
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحديث الاتصال بـ Google Drive",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (teacherLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Navigation Header */}
      <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold text-gray-900">نظام إدارة ملفات الطلاب</span>
              </div>
            </div>
            <div className="flex items-center space-x-reverse space-x-4">
              <div className="text-sm text-gray-700">
                مرحباً، {currentSession?.name || teacher?.name || "المعلم"}
              </div>
              <button 
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 space-x-reverse">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              نظرة عامة
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              إدارة الطلاب
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'files'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              إدارة الملفات
            </button>
            <button
              onClick={() => setActiveTab('upload-files')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload-files'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              رفع ملفات الطلاب
            </button>
            <button
              onClick={() => setActiveTab('parent-links')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parent-links'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              روابط أولياء الأمور
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <StatsOverview teacherId={currentTeacherId} />
            {teacher && (
              <>
                <GoogleDriveConnect teacher={teacher} teacherId={currentTeacherId} />
                <div className="flex flex-wrap gap-3">
                  <CreateStudentFoldersButton teacherId={currentTeacherId} teacher={teacher} />
                  <Button 
                    onClick={handleRefreshConnection}
                    disabled={isRefreshing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? "جاري التحديث..." : "تحديث الاتصال بـ Google Drive"}
                  </Button>
                  <Button 
                    onClick={handleRepairFolders}
                    disabled={isRepairing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Wrench className="h-4 w-4" />
                    {isRepairing ? "جاري الإصلاح..." : "إصلاح مجلدات الطلاب"}
                  </Button>
                </div>
                <StudentFoldersList teacher={teacher} teacherId={currentTeacherId} />
              </>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            <StudentManagement 
              teacherId={currentTeacherId} 
              onStudentSelect={setSelectedStudent}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-6">
            <CameraUpload teacherId={currentTeacherId} />
            <FileManagement 
              teacherId={currentTeacherId}
              selectedStudent={selectedStudent}
            />
          </div>
        )}

        {activeTab === 'upload-files' && (
          <div className="space-y-6">
            <FileUpload teacherId={currentTeacherId} />
          </div>
        )}

        {activeTab === 'parent-links' && teacher && (
          <div className="space-y-6">
            <ParentLinkGenerator teacher={teacher} />
          </div>
        )}
      </div>
    </div>
  );
}