import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-ink text-muted">
      <div className="mx-auto flex max-w-360 items-center gap-6 px-6 py-6 lg:px-14 lg:py-10">
        <Image src="/Logo.png" alt="" width={68} height={60} className="h-15 w-auto" />
        <p className="text-lg lg:text-xl">© 2026 Hii Stranger</p>
      </div>
    </footer>
  );
}
