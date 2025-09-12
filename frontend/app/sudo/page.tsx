"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type OperatorActivity = {
  user_id: number;
  username: string;
  name: string;
  last_login?: string;
  panel_count: number;
  total_users_created: number;
  last_activity?: string;
  is_active: boolean;
};

type PanelActivity = {
  panel_id: number;
  panel_name: string;
  panel_url: string;
  operator_count: number;
  total_users: number;
  last_user_created?: string;
  is_accessible: boolean;
};

type SudoStats = {
  users: {
    total: number;
    active: number;
    operators: number;
    admins: number;
  };
  panels: {
    total: number;
    active: number;
  };
  activities: {
    total: number;
    today: number;
    users_created_today: number;
  };
};

export default function SudoPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isRootAdmin, setIsRootAdmin] = useState(false);
  const [operators, setOperators] = useState<OperatorActivity[]>([]);
  const [panels, setPanels] = useState<PanelActivity[]>([]);
  const [stats, setStats] = useState<SudoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<OperatorActivity | null>(null);
  const [operatorDetails, setOperatorDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const check = async () => {
      try {
        const me = await apiFetch("/auth/me");
        setIsRootAdmin(!!me?.is_root_admin);
        if (me?.is_root_admin) {
          await loadData();
        }
      } catch {}
      setAuthChecked(true);
    };
    check();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [operatorsData, panelsData, statsData] = await Promise.all([
        apiFetch("/sudo/operators"),
        apiFetch("/sudo/panels"),
        apiFetch("/sudo/stats")
      ]);
      setOperators(operatorsData);
      setPanels(panelsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOperatorDetails = async (operatorId: number) => {
    try {
      const details = await apiFetch(`/sudo/operator/${operatorId}/details`);
      setOperatorDetails(details);
    } catch (error) {
      console.error("Error loading operator details:", error);
    }
  };

  const executeSudoAction = async (operatorId: number, action: string, reason?: string, newPassword?: string) => {
    setActionLoading(prev => ({ ...prev, [`${operatorId}_${action}`]: true }));
    
    try {
      const response = await apiFetch("/sudo/control", {
        method: "POST",
        body: JSON.stringify({
          action,
          target_user_id: operatorId,
          reason,
          new_password: newPassword
        })
      });
      
      if (response.success) {
        alert(response.message);
        await loadData();
        if (selectedOperator?.user_id === operatorId) {
          await loadOperatorDetails(operatorId);
        }
      }
    } catch (error: any) {
      alert(`خطا: ${error.message || "خطای نامشخص"}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`${operatorId}_${action}`]: false }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "نامشخص";
    return new Date(dateString).toLocaleString("fa-IR");
  };

  if (!authChecked) return null;
  
  if (!isRootAdmin) {
    return (
      <main className="p-6">
        <div className="max-w-xl mx-auto text-center border rounded-md p-6 bg-red-500/10 border-red-500/30 text-red-700">
          دسترسی غیرمجاز: فقط سوپر ادمین‌ها می‌توانند به این صفحه دسترسی داشته باشند.
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">کنترل‌های سوپر ادمین</h1>
        <p className="text-sm text-muted-foreground">نظارت و کنترل کامل بر اپراتورها و سیستم</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">کل کاربران</div>
              <div className="text-2xl font-semibold">{stats.users.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.users.active} فعال
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">اپراتورها</div>
              <div className="text-2xl font-semibold">{stats.users.operators}</div>
              <div className="text-xs text-muted-foreground">
                {stats.users.admins} ادمین
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">پنل‌ها</div>
              <div className="text-2xl font-semibold">{stats.panels.total}</div>
              <div className="text-xs text-muted-foreground">
                {stats.panels.active} فعال
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">کاربران امروز</div>
              <div className="text-2xl font-semibold">{stats.activities.users_created_today}</div>
              <div className="text-xs text-muted-foreground">
                {stats.activities.today} فعالیت
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operators */}
        <Card>
          <CardHeader>
            <CardTitle>اپراتورها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operators.map((operator) => (
                <div key={operator.user_id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{operator.name}</h3>
                      <p className="text-sm text-muted-foreground">{operator.username}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        operator.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {operator.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                    <div>پنل‌ها: {operator.panel_count}</div>
                    <div>کاربران: {operator.total_users_created}</div>
                    <div>آخرین ورود: {formatDate(operator.last_login)}</div>
                    <div>آخرین فعالیت: {formatDate(operator.last_activity)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOperator(operator);
                        loadOperatorDetails(operator.user_id);
                      }}
                    >
                      جزئیات
                    </Button>
                    <Button
                      size="sm"
                      variant={operator.is_active ? "destructive" : "default"}
                      onClick={() => executeSudoAction(
                        operator.user_id,
                        operator.is_active ? "suspend" : "activate",
                        "عملیات سوپر ادمین"
                      )}
                      disabled={actionLoading[`${operator.user_id}_${operator.is_active ? 'suspend' : 'activate'}`]}
                    >
                      {operator.is_active ? "معلق کردن" : "فعال کردن"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeSudoAction(
                        operator.user_id,
                        "revoke_access",
                        "لغو دسترسی‌ها"
                      )}
                      disabled={actionLoading[`${operator.user_id}_revoke_access`]}
                    >
                      لغو دسترسی
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Panels */}
        <Card>
          <CardHeader>
            <CardTitle>پنل‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {panels.map((panel) => (
                <div key={panel.panel_id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{panel.panel_name}</h3>
                      <p className="text-sm text-muted-foreground">{panel.panel_url}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      panel.is_accessible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {panel.is_accessible ? 'قابل دسترسی' : 'غیرقابل دسترسی'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                    <div>اپراتورها: {panel.operator_count}</div>
                    <div>کاربران: {panel.total_users}</div>
                    <div className="col-span-2">
                      آخرین کاربر: {formatDate(panel.last_user_created)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operator Details Modal */}
      {selectedOperator && operatorDetails && (
        <Card>
          <CardHeader>
            <CardTitle>جزئیات اپراتور: {selectedOperator.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">اطلاعات کلی</h4>
                  <div className="text-sm space-y-1">
                    <div>نام: {operatorDetails.operator.name}</div>
                    <div>ایمیل: {operatorDetails.operator.email}</div>
                    <div>نقش: {operatorDetails.operator.role}</div>
                    <div>وضعیت: {operatorDetails.operator.is_active ? 'فعال' : 'غیرفعال'}</div>
                    <div>آخرین ورود: {formatDate(operatorDetails.operator.last_login)}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">آمار</h4>
                  <div className="text-sm space-y-1">
                    <div>کل کاربران ایجاد شده: {operatorDetails.statistics.total_users_created}</div>
                    <div>کل فعالیت‌ها: {operatorDetails.statistics.total_activities}</div>
                    <div>پنل‌های قابل دسترسی: {operatorDetails.statistics.panels_with_access}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">پنل‌های قابل دسترسی</h4>
                <div className="space-y-2">
                  {operatorDetails.accessible_panels.map((panel: any, index: number) => (
                    <div key={index} className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">{panel.panel_name}</div>
                      <div className="text-muted-foreground">{panel.panel_url}</div>
                      <div className="text-muted-foreground">نام کاربری: {panel.operator_username}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">آخرین فعالیت‌ها</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {operatorDetails.recent_activities.map((activity: any, index: number) => (
                    <div key={index} className="text-sm p-2 border rounded">
                      <div className="font-medium">{activity.action}</div>
                      <div className="text-muted-foreground">
                        هدف: {activity.target} | {formatDate(activity.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const newPassword = prompt("رمز عبور جدید را وارد کنید:");
                    if (newPassword) {
                      executeSudoAction(
                        selectedOperator.user_id,
                        "reset_password",
                        "تغییر رمز عبور توسط سوپر ادمین",
                        newPassword
                      );
                    }
                  }}
                  variant="outline"
                >
                  تغییر رمز عبور
                </Button>
                <Button
                  onClick={() => {
                    setSelectedOperator(null);
                    setOperatorDetails(null);
                  }}
                  variant="outline"
                >
                  بستن
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}