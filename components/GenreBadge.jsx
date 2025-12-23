import Link from 'next/link';

export default function GenreBadge({ genre, size = 'default' }) {
  const sizeClasses = {
    small: 'px-3 py-1 text-xs',
    default: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  return (
    <Link
      href={`/genres/${genre.slug}`}
      className={`genre-badge inline-block rounded-full font-medium text-gray-200 ${sizeClasses[size]}`}
    >
      {genre.title}
    </Link>
  );
}

