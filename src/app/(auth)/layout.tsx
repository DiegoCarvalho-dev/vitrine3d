import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8 sm:py-10">
      <header>
        <Link
          href="/"
          className="font-heading text-lg font-bold tracking-tight font-stretch-semi-expanded"
        >
          Vitrine 3D
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center pt-10 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
