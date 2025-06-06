
import React, { useState } from 'react';
import { Clock, Check, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Request } from '@/types/profileTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HistoryItemsProps {
  historyItems: Request[];
  handleClearHistory: () => void;
}

const HistoryItems = ({ historyItems, handleClearHistory }: HistoryItemsProps) => {
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);

  const renderStatusDetails = (item: Request) => {
    if (!item.lastStatusUpdate) return null;
    
    return (
      <div className="text-xs text-jd-mutedText mt-1">
        {item.statusChangedBy && item.statusChangedBy !== item.creator ? (
          <span className="font-medium">
            Status changed by admin: {item.statusChangedBy}
          </span>
        ) : (
          <span>Status updated</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-jd-card rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-medium">History</h3>
          <p className="text-jd-mutedText">
            Items that have been completed or rejected
          </p>
        </div>
        
        {historyItems.length > 0 && (
          <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
              >
                <Trash2 size={16} />
                Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-jd-card border-jd-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear History</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to clear your history? This will permanently remove all completed and rejected items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-jd-bg hover:bg-jd-bg/80">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleClearHistory}
                >
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      {historyItems.length > 0 ? (
        <div className="space-y-4">
          {historyItems.map((item, index) => (
            <div 
              key={index} 
              className={`border border-jd-bg rounded-lg p-4 ${item.isExpired ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-jd-purple">{item.department}</p>
                  <p className="text-sm text-jd-mutedText mt-1">
                    {item.description?.slice(0, 100)}{item.description?.length > 100 ? '...' : ''}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === "Completed" ? "bg-green-500/20 text-green-500" :
                      "bg-gray-500/20 text-gray-500"
                    }`}>
                      {item.status}
                    </span>
                    {item.lastStatusUpdateTime && (
                      <div className="flex items-center gap-1 text-xs text-jd-mutedText ml-4">
                        <Clock size={12} />
                        <span>
                          Updated: {item.lastStatusUpdateTime}
                        </span>
                      </div>
                    )}
                    {renderStatusDetails(item)}
                    {item.isExpired && (
                      <span className="ml-4 text-xs text-red-500">
                        Expired - Will be deleted soon
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-jd-bg rounded-lg">
          <Check size={48} className="mx-auto text-jd-mutedText mb-3" />
          <h4 className="text-lg font-medium mb-2">No History</h4>
          <p className="text-jd-mutedText max-w-md mx-auto">
            You don't have any completed or rejected items in your history.
          </p>
        </div>
      )}
    </div>
  );
};

export default HistoryItems;
