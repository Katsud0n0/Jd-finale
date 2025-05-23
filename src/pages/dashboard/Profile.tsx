
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Request } from "@/types/profileTypes";

// Import the refactored components
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import ActivitySummary from "@/components/profile/ActivitySummary";
import RecentActivity from "@/components/profile/RecentActivity";
import AcceptedItems from "@/components/profile/AcceptedItems";
import HistoryItems from "@/components/profile/HistoryItems";
import ArchivedProjects from "@/components/profile/ArchivedProjects";
import DebugRequests from "@/components/profile/DebugRequests";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  
  useEffect(() => {
    loadRequests();
    
    // Check for expired archived projects and status changes
    const interval = setInterval(() => {
      checkArchivedProjects();
      checkExpiredItems();
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const loadRequests = () => {
    const storedRequests = localStorage.getItem("jd-requests");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  };
  
  // Check for archived projects that need to be deleted
  const checkArchivedProjects = () => {
    const now = new Date();
    const storedRequests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
    
    const updatedRequests = storedRequests.filter((req: Request) => {
      // Skip if not archived or not pending
      if (!req.archived || req.status !== "Pending") return true;
      
      // For archived projects, check if 7 days have passed
      if (req.archivedAt) {
        const archiveDate = new Date(req.archivedAt);
        const deleteDate = new Date(archiveDate);
        deleteDate.setDate(deleteDate.getDate() + 7);
        
        return now <= deleteDate; // Keep if not yet due for deletion
      }
      
      return true;
    });
    
    if (updatedRequests.length < storedRequests.length) {
      // Some archived projects were deleted
      localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
      
      toast({
        title: "Projects removed",
        description: "Some archived projects have been automatically deleted after 7 days.",
      });
    }
  };

  // Check for expired items (completed or rejected for more than 1 day)
  const checkExpiredItems = () => {
    const now = new Date();
    const storedRequests = JSON.parse(localStorage.getItem("jd-requests") || "[]");
    
    const updatedRequests = storedRequests.map((req: Request) => {
      // Check if completed or rejected status
      if ((req.status === "Completed" || req.status === "Rejected") && req.lastStatusUpdate) {
        const statusUpdateDate = new Date(req.lastStatusUpdate);
        const oneDayLater = new Date(statusUpdateDate);
        oneDayLater.setDate(oneDayLater.getDate() + 1);
        
        if (now > oneDayLater && !req.isExpired) {
          // Mark as expired for visual fading, will be deleted on next check
          return { ...req, isExpired: true };
        } else if (req.isExpired) {
          // If already marked as expired, it should be deleted now
          return null;
        }
      }
      
      return req;
    }).filter(Boolean); // Remove null items (deleted requests)
    
    if (updatedRequests.length < storedRequests.length || JSON.stringify(updatedRequests) !== JSON.stringify(storedRequests)) {
      localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
      setRequests(updatedRequests);
    }
  };

  // Filter requests for current user - For projects, show all items user has accepted
  const userRequests = requests.filter((r: Request) =>
    // Show all requests created by the user
    r.creator === user?.username ||
    // Or if user is part of a project via the acceptedBy array
    (r.type === "project" && r.acceptedBy && Array.isArray(r.acceptedBy) && r.acceptedBy.includes(user?.username))
  );

  // Get archived projects (admin only)
  const archivedProjects = requests.filter(
    (r: Request) => r.type === "project" && r.archived && 
    // Show archived projects only to admins
    (user?.role === "admin" ? r.department === user?.department : r.creator === user?.username)
  );

  // Accepted projects and requests - both as creator and as acceptedBy
  const acceptedItems = requests.filter((r: Request) => {
    // In Process status is required for all
    if (r.status !== "In Process") return false;
    
    // Project type
    if (r.type === "project") {
      // Check if user is in acceptedBy array
      return r.acceptedBy && Array.isArray(r.acceptedBy) && r.acceptedBy.includes(user?.username || '');
    }
    
    // Request type
    if (r.type === "request") {
      // Check if user is the acceptedBy (string) or in acceptedBy array
      if (typeof r.acceptedBy === 'string') {
        return r.acceptedBy === user?.username;
      }
      
      if (Array.isArray(r.acceptedBy)) {
        return r.acceptedBy.includes(user?.username || '');
      }
    }
    
    return false;
  });

  // Get history items (completed or rejected)
  const historyItems = requests.filter((r: Request) => {
    // Must be Completed or Rejected
    if (r.status !== "Completed" && r.status !== "Rejected") return false;
    
    // Show if user created it
    if (r.creator === user?.username) return true;
    
    // Or if user is in acceptedBy (either string or array)
    if (typeof r.acceptedBy === 'string') {
      return r.acceptedBy === user?.username;
    }
    
    if (Array.isArray(r.acceptedBy)) {
      return r.acceptedBy.includes(user?.username || '');
    }
    
    return false;
  });

  // Get recent activity
  const recentActivity = userRequests
    .filter((r: Request) => !r.archived)
    .slice(0, 3);

  // Handle unarchive project
  const handleUnarchive = (projectId: string) => {
    const updatedRequests = requests.map((r: Request) => 
      r.id === projectId ? { ...r, archived: false, archivedAt: null } : r
    );
    setRequests(updatedRequests);
    localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
    
    toast({
      title: "Project restored",
      description: "The project has been restored from the archive.",
    });
  };

  // Handle permanent delete
  const handleDelete = (projectId: string) => {
    const updatedRequests = requests.filter((r: Request) => r.id !== projectId);
    setRequests(updatedRequests);
    localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
    
    toast({
      title: "Project deleted",
      description: "The project has been permanently deleted.",
    });
  };

  // When user marks as completed in a project, mark their completion; update to "Completed" only after all users have marked completed.
  const handleMarkCompleted = (itemId: string) => {
    const now = new Date();
    const updatedRequests = requests.map((r: Request) => {
      if (r.id === itemId) {
        if (r.type === "project") {
          const participantsCompleted = Array.isArray(r.participantsCompleted)
            ? [...r.participantsCompleted]
            : [];
          if (!participantsCompleted.includes(user?.username || '')) {
            participantsCompleted.push(user?.username || '');
          }
          const acceptedUsers = Array.isArray(r.acceptedBy) ? r.acceptedBy : [];
          if (participantsCompleted.length === acceptedUsers.length) {
            return {
              ...r,
              status: "Completed",
              lastStatusUpdate: now.toISOString(),
              lastStatusUpdateTime: now.toLocaleTimeString(),
              participantsCompleted,
            };
          }
          return {
            ...r,
            participantsCompleted,
          };
        }
        // Regular requests logic
        return {
          ...r,
          status: "Completed",
          lastStatusUpdate: now.toISOString(),
          lastStatusUpdateTime: now.toLocaleTimeString(),
        };
      }
      return r;
    });
    setRequests(updatedRequests);
    localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
    toast({
      title: "Marked as Completed",
      description: "The item has been marked as completed successfully.",
    });
  };

  // Reject button (previously Abandon)
  const handleAbandon = (itemId: string) => {
    const item = requests.find((r: Request) => r.id === itemId);
    
    const now = new Date();
    
    // For multi-department requests or projects, only remove this user
    if (item && (item.multiDepartment || item.type === "project")) {
      const updatedRequests = requests.map((r: Request) => {
        if (r.id === itemId) {
          // Get current acceptedBy list
          const currentAcceptedBy = Array.isArray(r.acceptedBy) ? [...r.acceptedBy] : [];
          // Remove current user
          const newAcceptedBy = currentAcceptedBy.filter(username => username !== user?.username);
          // Update users accepted count
          const newUsersAccepted = (r.usersAccepted || 0) - 1;
          
          // If all users have rejected, set status back to Pending
          const newStatus = newAcceptedBy.length === 0 ? "Pending" : r.status;
          
          return {
            ...r,
            acceptedBy: newAcceptedBy,
            usersAccepted: newUsersAccepted,
            status: newStatus,
            // Update timestamp if status changed
            ...(newStatus !== r.status && {
              lastStatusUpdate: now.toISOString(),
              lastStatusUpdateTime: now.toLocaleTimeString()
            })
          };
        }
        return r;
      });
      
      setRequests(updatedRequests);
      localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
      
      toast({
        title: "Request rejected",
        description: "You have been removed from the participants list.",
      });
      return;
    }
    
    // For regular requests, mark as rejected
    const updatedRequests = requests.map((r: Request) => 
      r.id === itemId ? { 
        ...r, 
        status: "Rejected", 
        lastStatusUpdate: now.toISOString(),
        lastStatusUpdateTime: now.toLocaleTimeString()
      } : r
    );
    
    setRequests(updatedRequests);
    localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
    
    toast({
      title: "Request Rejected",
      description: "The item has been rejected and marked as such.",
    });
  };

  // Handle clear history
  const handleClearHistory = () => {
    const updatedRequests = requests.filter((r: Request) => 
      !(r.creator === user?.username && (r.status === "Completed" || r.status === "Rejected"))
    );
    setRequests(updatedRequests);
    localStorage.setItem("jd-requests", JSON.stringify(updatedRequests));
    
    toast({
      title: "History cleared",
      description: "Your history has been cleared successfully.",
    });
  };

  // Calculate days left before auto-deletion for archived projects
  const getDaysRemaining = (archivedAt: string) => {
    if (!archivedAt) return "Unknown";
    
    const archiveDate = new Date(archivedAt);
    const deleteDate = new Date(archiveDate);
    deleteDate.setDate(deleteDate.getDate() + 7);
    
    const now = new Date();
    const diffTime = deleteDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? `${diffDays} days` : "Today";
  };

  // Determine if the Archived tab should be shown (only for admins)
  const showArchivedTab = user?.role === "admin";

  // Function to check if a user has already marked this project as completed
  const hasMarkedCompleted = (item: Request) => {
    return item.type === "project"
      && Array.isArray(item.participantsCompleted)
      && item.participantsCompleted.includes(user?.username || '');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <ProfileSidebar user={user} logout={logout} />
        <div className="mt-4">
          <DebugRequests />
        </div>
      </div>
      
      <div className="lg:col-span-2 space-y-6">
        <Tabs defaultValue="activity">
          <TabsList className={`grid ${showArchivedTab ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {showArchivedTab && (
              <TabsTrigger value="archived" className="flex items-center gap-1">
                <Archive size={16} /> Archived
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="activity" className="space-y-6 mt-4">
            <ActivitySummary userRequests={userRequests} />
            <RecentActivity recentActivity={recentActivity} />
          </TabsContent>

          <TabsContent value="accepted" className="mt-4">
            <AcceptedItems 
              acceptedItems={acceptedItems}
              handleMarkCompleted={handleMarkCompleted} 
              handleAbandon={handleAbandon}
              hasMarkedCompleted={hasMarkedCompleted}
              user={user}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <HistoryItems 
              historyItems={historyItems}
              handleClearHistory={handleClearHistory}
            />
          </TabsContent>

          {showArchivedTab && (
            <TabsContent value="archived" className="mt-4">
              <ArchivedProjects 
                archivedProjects={archivedProjects}
                handleUnarchive={handleUnarchive}
                handleDelete={handleDelete}
                getDaysRemaining={getDaysRemaining}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
