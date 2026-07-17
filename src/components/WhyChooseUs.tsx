"use client";

import { motion } from "framer-motion";
import { Gem, Layers, BadgeIndianRupee, PlayCircle } from "lucide-react";

export default function WhyChooseUs() {
  const reasons = [
    {
      icon: <Gem className="text-brand-blue" size={32} />,
      title: "Competitive Pricing",
      desc: "Get the most out of your budget with our competitive pricing. Shop now and enjoy quality products affordably.",
    },
    {
      icon: <Layers className="text-brand-blue" size={32} />,
      title: "Quality Products",
      desc: "Discover our selection of premium quality products that exceed your expectations. Enjoy the best in class items products.",
    },
    {
      icon: <BadgeIndianRupee className="text-brand-blue" size={32} />,
      title: "Value for Money",
      desc: "Maximize your buying power with our value-packed products at affordable prices. Shop now and save more.",
    },
  ];

  return (
    <section className="w-full bg-brand-gray py-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-20">
        
        {/* Top Feature Grid */}
        <div className="text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-brand-dark mb-12"
          >
            Why Choose Classic Concepts
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {reasons.map((reason, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-4 bg-white p-8 rounded-2xl shadow-sm border border-gray-50 hover:shadow-xl transition-shadow"
              >
                <div className="bg-brand-blue-light w-16 h-16 rounded-full flex items-center justify-center mb-2">
                  {reason.icon}
                </div>
                <h3 className="text-xl font-bold text-brand-dark">{reason.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{reason.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How We Do It Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <h3 className="text-3xl font-bold text-brand-blue">How We Do It?</h3>
            <p className="text-gray-700 leading-relaxed">
              At Classic Concepts, we utilize innovative technologies and employ a highly qualified team of engineers to design podiums and other acrylic products.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our Acrylic products are crafted with the utmost attention to detail, ensuring they are durable and easy to handle. We also pride ourselves on our competitive pricing and elegant finish, providing exceptional value to our customers.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We are committed to delivering quality products and offer quick after-sales services, ensuring that our customers are always satisfied. Our passion for designing winning solutions and customer satisfaction is what sets us apart from our competitors.
            </p>
          </motion.div>
          
          {/* Video Placeholder */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden relative group cursor-pointer shadow-lg"
          >
            {/* Abstract factory/process image background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/80 to-brand-dark/80 z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')] bg-cover bg-center" />
            
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="bg-brand-red w-16 h-16 rounded-full flex items-center justify-center pl-1 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(211,47,47,0.5)]">
                <PlayCircle className="text-white w-10 h-10" />
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 z-20">
              <p className="text-white font-semibold text-lg drop-shadow-md">India&apos;s Leading Manufacturer of Acrylic Products</p>
              <p className="text-gray-200 text-sm drop-shadow-md">Classic Concepts Acrylic Private Limited</p>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
