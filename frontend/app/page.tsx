export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-primary">پنل مدیریت مرزبان</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            سیستم جامع مدیریت کاربران و پنل‌های مرزبان با قابلیت‌های پیشرفته نظارت و کنترل
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">مدیریت کاربران</h3>
            <p className="text-sm text-muted-foreground">ایجاد و مدیریت کاربران با سطوح دسترسی مختلف</p>
          </div>
          
          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">نظارت کامل</h3>
            <p className="text-sm text-muted-foreground">نظارت و کنترل کامل بر فعالیت‌های اپراتورها</p>
          </div>
          
          <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
            <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">عملکرد بالا</h3>
            <p className="text-sm text-muted-foreground">سیستم بهینه‌شده برای عملکرد سریع و قابل اعتماد</p>
          </div>
        </div>
        
        <div className="mt-12">
          <a 
            href="/auth/login" 
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            ورود به سیستم
          </a>
        </div>
      </div>
    </main>
  );
}