import { SquareTerminal, Timer, UserRoundGroup } from "lucide-react";
import { Container } from "./Container";
import { Card, CardContent, CardHeader } from "./ui/card";

export default function Question() {
	return (
		<div className="bg-neutral text-white">
			<Container className="py-20">
				<h2 className="text-primary uppercase text-center">why leetcompete</h2>
				<p className="text-center text-3xl font-bold my-2">Built for Algorithmic Excellence</p>
				<p className="text-center text-sm">Everything you need to go from coding fundamentals to international finals.</p>
				<div className="flex my-20 justify-around">
					<Card className="w-1/4 px-3 py-5 bg-neutral-800 rounded-sm">
						<CardHeader>
							<div className="p-2 w-fit bg-green-300 rounded">
								<Timer color="#ea580c" size={20} />
							</div>
						</CardHeader>
						<CardContent className="mt-4">
							<h3 className="text-sm font-bold text-white">Weekly Rated Contests</h3>
							<p className="text-gray-300 my-2">Regular timed contests modeled after ICPC and top platforms to build speed, accuracy, and confidence under time constraints.</p>
						</CardContent>
					</Card>
					<Card className="w-1/4 px-3 py-5 bg-neutral-800 rounded-sm">
						<CardHeader>
							<div className="p-2 w-fit bg-amber-600 rounded">
								<SquareTerminal color="#78350f" size={20} />
							</div>
						</CardHeader>
						<CardContent className="mt-4">
							<h3 className="text-sm font-bold text-white">Curated 800+ Problem Set</h3>
							<p className="text-gray-300 my-2">Structured problem tracks spanning dynamic programming, advanced graph algorithms, segment trees, and data structures.</p>
						</CardContent>
					</Card>
					<Card className="w-1/4 px-3 py-5 bg-neutral-800 rounded-sm">
						<CardHeader>
							<div className="p-2 w-fit bg-green-300 rounded">
								<UserRoundGroup color="#4d7c0f" size={20} />
							</div>
						</CardHeader>
						<CardContent className="mt-4">
							<h3 className="text-sm font-bold text-white">Peer Mentorship & Workshops</h3>
							<p className="text-gray-300 my-2">Live code post-mortems and targeted deep-dives led by senior competitors, ICPC regionalists, and industry alumni.</p>
						</CardContent>
					</Card>
				</div>
			</Container>
		</div>
	)
}

