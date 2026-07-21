import { Diamond, Package, PenTool } from "lucide-react";

export function WhyChooseUs() {
  return (
    <section className="bg-[#05060A] text-white py-20 relative overflow-hidden">
      {/* Dark Mesh Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[50%] h-[80%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[120px] opacity-20"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[60%] bg-[#e31837] rounded-full mix-blend-screen filter blur-[130px] opacity-20"></div>
        <div className="absolute -bottom-[20%] left-[30%] w-[60%] h-[50%] bg-[#ffdf00] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.15]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-center lg:items-start">
          
          {/* Left Title Column */}
          <div className="w-full lg:w-1/3 text-center lg:text-left">
            <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-3 block">Why Choose Us</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Why Choose<br />Classic Concepts?
            </h2>
          </div>
          
          {/* Right Features Columns */}
          <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#3b82f6] transition-all duration-300">
                <Diamond size={24} />
              </div>
              <h3 className="text-[17px] font-bold mb-3">Competitive Pricing</h3>
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                Get the most out of your budget with our competitive pricing. Shop now and enjoy quality products affordably.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#e31837] transition-all duration-300">
                <Package size={24} />
              </div>
              <h3 className="text-[17px] font-bold mb-3">Quality Products</h3>
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                Discover our selection of premium quality products that exceed your expectations. Enjoy the best in class items.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left group">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-[#e31837] transition-all duration-300">
                <PenTool size={24} />
              </div>
              <h3 className="text-[17px] font-bold mb-3">Value for Money</h3>
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                Maximize your buying power with our value-packed products at affordable prices. Shop now and save more.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
