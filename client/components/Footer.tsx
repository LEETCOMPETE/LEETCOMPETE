import Link from "next/link";
import { Container } from "./Container";

const links = [
	{ name: 'Discord', href: 'https://discord.com' },
	{ name: 'LinkedIn', href: 'https://linkedin.com' },
	{ name: 'Rules & Honor Code', href: '/rules' },
]

export default function Footer() {
	return (
		<footer className="bg-neutral text-white">
			<Container className="flex flex-wrap py-5 max-lg:text-center justify-between items-center">
				<p>© 2025 LEETCOMPETE. All rights reserved.</p>
				<div className="flex  gap-3 text-xs">
					{links.map(el => <Link key={el.href} target="_blank" href={el.href}>{el.name}</Link>)}
				</div>
			</Container>
		</footer>
	)
}

