import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-50/50 rounded-full blur-3xl" />
      </div>

      <div className="container px-6 relative z-10 mx-auto max-w-2xl text-center">
        <h1 className="text-[120px] md:text-[180px] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-400 leading-none tracking-tighter drop-shadow-sm select-none">
          404
        </h1>
        
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl border border-white mt-[-60px] md:mt-[-80px] relative">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0c1a40] mb-4 uppercase tracking-tight">
            Page Not Found
          </h2>
          
          <p className="text-slate-600 mb-8 text-lg">
            Oops! The page you're looking for seems to have been moved or no longer exists. 
            Let's get you back to exploring our premium acrylic collections.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#0c1a40] text-white rounded-xl font-bold uppercase tracking-wider hover:bg-[#e31837] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <Home size={18} />
              Back to Home
            </Link>
            
            <Link 
              href="/shop" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0c1a40] border-2 border-[#0c1a40] rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <Search size={18} />
              Browse Shop
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
