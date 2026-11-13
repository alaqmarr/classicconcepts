import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { EditableText } from "@/components/inline-edit/EditableText";
import { EditableImage } from "@/components/inline-edit/EditableImage";

interface ProblemStatementCardProps {
  problemStatement: {
    id?: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
}

export function ProblemStatementCard({
  problemStatement,
}: ProblemStatementCardProps) {
  const bgClass = "bg-slate-100";

  const letterFallback = (
    <div className="w-24 h-24 bg-white/40 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
      <span className="text-3xl font-extrabold text-slate-400">
        {problemStatement.name.charAt(0)}
      </span>
    </div>
  );

  return (
    <Link
      href={`/shop/problem/${problemStatement.slug}`}
      className="group block"
    >
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col h-72 cursor-pointer transform hover:-translate-y-1">
        {/* Image / Background Area */}
        <div
          className={`w-full h-52 ${bgClass} flex items-center justify-center relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 z-10 pointer-events-none" />

          {problemStatement.id ? (
            <EditableImage
              entity={{
                model: "problemStatement",
                id: problemStatement.id,
                field: "imageUrl",
              }}
              src={problemStatement.imageUrl}
              alt={problemStatement.name}
              label={`Problem Statement Image: ${problemStatement.name}`}
              aspectRatio={4 / 3}
              wrapperClassName="relative w-full h-full flex items-center justify-center"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              emptyPlaceholder={letterFallback}
            />
          ) : problemStatement.imageUrl ? (
            <Image
              src={problemStatement.imageUrl}
              alt={problemStatement.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            letterFallback
          )}
        </div>

        {/* Card Footer */}
        <div className="flex-1 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white via-slate-50/50 to-white z-20 border-t border-slate-50 relative">
          {problemStatement.id ? (
            <EditableText
              as="h3"
              entity={{
                model: "problemStatement",
                id: problemStatement.id,
                field: "name",
              }}
              value={problemStatement.name}
              label={`Problem Statement — ${problemStatement.name}`}
              className="font-bold text-[#0056b3] group-hover:text-slate-900 transition-colors"
            />
          ) : (
            <h3 className="font-bold text-[#0056b3] group-hover:text-slate-900 transition-colors">
              {problemStatement.name}
            </h3>
          )}
          <ArrowRight
            size={18}
            className="text-[#0056b3] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
          />
        </div>
      </div>
    </Link>
  );
}
