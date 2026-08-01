import Link from 'next/link';

export function FloatingWhatsApp({ phoneNumber }: { phoneNumber?: string | null }) {
  if (!phoneNumber) return null;
  
  // Format phone number for WhatsApp URL (remove spaces, plus, etc.)
  let formattedNumber = phoneNumber.replace(/\D/g, '');
  if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
      formattedNumber = '91' + formattedNumber;
  }
  const whatsappUrl = `https://wa.me/${formattedNumber}`;

  return (
    <Link
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-[60px] h-[60px] bg-[#25D366] text-white rounded-full shadow-lg hover:scale-110 transition-transform duration-300 hover:shadow-2xl group"
      aria-label="Chat with us on WhatsApp"
    >
      <svg
        viewBox="0 0 24 24"
        width="34"
        height="34"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        className="fill-current transform group-hover:rotate-12 transition-transform duration-300"
      >
        <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.525.146-.18.194-.3.297-.495.098-.21.046-.39-.034-.54-.075-.15-.673-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.285-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.21 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.345z"/>
        <path d="M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.005c6.585 0 11.944-5.336 11.947-11.896 0-3.181-1.248-6.177-3.477-8.45zM12.045 21.84c-1.774 0-3.51-.47-5.034-1.362l-.36-.21-3.743.975.99-3.633-.234-.37A9.873 9.873 0 0 1 2.095 11.9c.002-5.468 4.475-9.914 9.957-9.914 2.656 0 5.148 1.027 7.018 2.89 1.867 1.864 2.894 4.346 2.893 6.994-.003 5.467-4.477 9.913-9.918 9.913z"/>
      </svg>
    </Link>
  );
}
