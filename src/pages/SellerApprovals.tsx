import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, User, Building, Phone, Mail, ShieldOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SellerApplication {
  id: string;
  user_id: string;
  business_name: string;
  phone: string;
  approval_status: string;
  created_at: string;
  user_email?: string;
  rejection_reason?: string;
  is_deactivated?: boolean;
}

export default function SellerApprovals() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          id,
          user_id,
          business_name,
          phone,
          approval_status,
          created_at,
          rejection_reason,
          is_deactivated
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails
      const applicationsWithEmails = await Promise.all(
        (data || []).map(async (app) => {
          const { data: userData } = await supabase.auth.admin.getUserById(app.user_id);
          return {
            ...app,
            user_email: userData?.user?.email || 'Unknown'
          };
        })
      );

      setApplications(applicationsWithEmails);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load seller applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (applicationId: string, status: 'approved' | 'rejected') => {
    try {
      const updateData: any = {
        approval_status: status,
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      };

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('sellers')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application ${status} successfully`,
        variant: "default"
      });

      setRejectionReason('');
      setSelectedApplication(null);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive"
      });
    }
  };

  const handleDeactivateToggle = async (applicationId: string, currentlyDeactivated: boolean) => {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ is_deactivated: !currentlyDeactivated })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Seller ${!currentlyDeactivated ? 'deactivated' : 'activated'} successfully`,
      });

      fetchApplications();
    } catch (error) {
      console.error('Error toggling deactivation:', error);
      toast({
        title: "Error",
        description: "Failed to update seller status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Seller Applications</h1>
        <p className="text-muted-foreground">Review and approve seller applications</p>
      </div>

      <div className="grid gap-6">
        {applications.map((app) => (
          <Card key={app.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    {app.business_name || 'Unnamed Business'}
                  </CardTitle>
                  <p className="text-muted-foreground">Applied on {new Date(app.created_at).toLocaleDateString()}</p>
                </div>
                {getStatusBadge(app.approval_status)}
                {app.is_deactivated && (
                  <Badge variant="destructive"><ShieldOff className="w-3 h-3 mr-1" />Deactivated</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{app.user_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{app.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Individual Seller</span>
                </div>
              </div>

              {app.rejection_reason && (
                <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                  <p className="text-sm text-muted-foreground">{app.rejection_reason}</p>
                </div>
              )}

              {app.approval_status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="default"
                    onClick={() => handleApproval(app.id, 'approved')}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setSelectedApplication(app.id)}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {selectedApplication === app.id && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval(app.id, 'rejected')}
                      disabled={!rejectionReason.trim()}
                    >
                      Confirm Rejection
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApplication(null);
                        setRejectionReason('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {app.approval_status === 'approved' && (
                <div className="pt-4">
                  <Button
                    variant={app.is_deactivated ? 'default' : 'destructive'}
                    onClick={() => handleDeactivateToggle(app.id, !!app.is_deactivated)}
                    className="w-full"
                  >
                    {app.is_deactivated ? (
                      <><ShieldCheck className="w-4 h-4 mr-2" />Activate Seller</>
                    ) : (
                      <><ShieldOff className="w-4 h-4 mr-2" />Deactivate Seller</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {applications.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Applications</h3>
              <p className="text-muted-foreground">No seller applications found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}