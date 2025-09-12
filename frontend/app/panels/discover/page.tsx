"use client";

import { useState } from "react";
import { apiFetch } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

type MarzbanPanelInfo = {
  url: string;
  title?: string;
  version?: string;
  is_accessible: boolean;
  has_api: boolean;
  api_endpoint?: string;
  error_message?: string;
};

type SearchResponse = {
  found_panels: MarzbanPanelInfo[];
  total_checked: number;
  total_found: number;
};

export default function PanelDiscoverPage() {
  const [searchUrls, setSearchUrls] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MarzbanPanelInfo[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [importing, setImporting] = useState<{ [key: string]: boolean }>({});
  const [importForm, setImportForm] = useState<{ [key: string]: { username: string; password: string; name: string } }>({});

  const searchByUrls = async () => {
    if (!searchUrls.trim()) return;
    
    setLoading(true);
    setResults([]);
    setSearchResponse(null);
    
    try {
      const urls = searchUrls.split('\n').map(url => url.trim()).filter(url => url);
      const response = await apiFetch("/marzban/search", {
        method: "POST",
        body: JSON.stringify({
          base_urls: urls,
          timeout: 10,
          check_api: true
        })
      });
      
      setSearchResponse(response);
      setResults(response.found_panels);
    } catch (error: any) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const discoverByDomain = async () => {
    if (!domain.trim()) return;
    
    setLoading(true);
    setResults([]);
    setSearchResponse(null);
    
    try {
      const response = await apiFetch(`/marzban/discover?domain=${encodeURIComponent(domain)}`);
      setResults(response);
    } catch (error: any) {
      console.error("Discovery error:", error);
    } finally {
      setLoading(false);
    }
  };

  const importPanel = async (panelInfo: MarzbanPanelInfo) => {
    const form = importForm[panelInfo.url];
    if (!form || !form.username || !form.password) return;
    
    setImporting(prev => ({ ...prev, [panelInfo.url]: true }));
    
    try {
      const response = await apiFetch("/marzban/import", {
        method: "POST",
        body: JSON.stringify({
          panel_info: panelInfo,
          username: form.username,
          password: form.password,
          panel_name: form.name || undefined
        })
      });
      
      alert("پنل با موفقیت اضافه شد!");
      // Remove from results
      setResults(prev => prev.filter(p => p.url !== panelInfo.url));
    } catch (error: any) {
      alert(`خطا در اضافه کردن پنل: ${error.message || "خطای نامشخص"}`);
    } finally {
      setImporting(prev => ({ ...prev, [panelInfo.url]: false }));
    }
  };

  const updateImportForm = (url: string, field: string, value: string) => {
    setImportForm(prev => ({
      ...prev,
      [url]: {
        ...prev[url],
        [field]: value
      }
    }));
  };

  return (
    <main className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">کشف پنل‌های مرزبان</h1>
        <p className="text-sm text-muted-foreground">جستجو و کشف پنل‌های مرزبان در شبکه</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search by URLs */}
        <Card>
          <CardHeader>
            <CardTitle>جستجو با URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">URL های پنل (هر خط یک URL)</label>
              <textarea
                className="w-full h-32 px-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                placeholder="https://panel1.example.com&#10;https://panel2.example.com&#10;192.168.1.100:8080"
                value={searchUrls}
                onChange={e => setSearchUrls(e.target.value)}
              />
            </div>
            <Button 
              onClick={searchByUrls} 
              disabled={loading || !searchUrls.trim()}
              className="w-full"
            >
              {loading ? "در حال جستجو..." : "جستجو"}
            </Button>
          </CardContent>
        </Card>

        {/* Discover by Domain */}
        <Card>
          <CardHeader>
            <CardTitle>کشف خودکار</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">دامنه</label>
              <input
                className="w-full h-10 px-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                placeholder="example.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
              />
            </div>
            <Button 
              onClick={discoverByDomain} 
              disabled={loading || !domain.trim()}
              className="w-full"
            >
              {loading ? "در حال کشف..." : "کشف پنل‌ها"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {searchResponse && (
        <Card>
          <CardHeader>
            <CardTitle>نتایج جستجو</CardTitle>
            <p className="text-sm text-muted-foreground">
              {searchResponse.total_found} پنل از {searchResponse.total_checked} URL بررسی شده یافت شد
            </p>
          </CardHeader>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>پنل‌های یافت شده</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((panel, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{panel.title || panel.url}</h3>
                      <p className="text-sm text-muted-foreground">{panel.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        panel.is_accessible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {panel.is_accessible ? 'قابل دسترسی' : 'غیرقابل دسترسی'}
                      </span>
                      {panel.has_api && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          API موجود
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {panel.error_message && (
                    <p className="text-sm text-red-600">{panel.error_message}</p>
                  )}
                  
                  {panel.is_accessible && panel.has_api && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        className="h-9 px-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                        placeholder="نام کاربری"
                        value={importForm[panel.url]?.username || ''}
                        onChange={e => updateImportForm(panel.url, 'username', e.target.value)}
                      />
                      <input
                        type="password"
                        className="h-9 px-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                        placeholder="رمز عبور"
                        value={importForm[panel.url]?.password || ''}
                        onChange={e => updateImportForm(panel.url, 'password', e.target.value)}
                      />
                      <input
                        className="h-9 px-3 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                        placeholder="نام پنل (اختیاری)"
                        value={importForm[panel.url]?.name || ''}
                        onChange={e => updateImportForm(panel.url, 'name', e.target.value)}
                      />
                    </div>
                  )}
                  
                  {panel.is_accessible && panel.has_api && (
                    <Button
                      onClick={() => importPanel(panel)}
                      disabled={importing[panel.url] || !importForm[panel.url]?.username || !importForm[panel.url]?.password}
                      size="sm"
                    >
                      {importing[panel.url] ? "در حال اضافه کردن..." : "اضافه کردن پنل"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}