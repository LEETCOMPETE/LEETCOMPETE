import { MoveRight } from "lucide-react";
import { Container } from "./Container";
import { Button } from "./ui/button";

const event = {
	title: "Fall Invitational #1",
	type: "Division 1 & 2 Open",
	category: "Contest",
	startsIn: "10-20-2026",
	format: 'ICPC Style',
	duration: 2.5,
	challanges: 6,
	prize: 200,
	typeOfPrize: "wallet points"
}

function remaining(targetDate) {
	const diff = targetDate.getTime() - Date.now();
	const days = Math.floor(diff / 86400000);
	const hours = Math.floor((diff % 86400000) / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);
	const seconds = Math.floor((diff % 60000) / 1000);
	return { days, hours, minutes, seconds };
}

export default function Hero() {
	const startTime = new Date(event.startsIn)
	const { days, hours, minutes, seconds } = remaining(startTime)
	return (
		<section className="bg-neutral relative text-white overflow-hidden">
			<div className="absolute w-300 h-300 rounded-full z-1 left-[50%] translate-[-50%] blur-lg opacity-10 bg-primary" />
			<Container className="py-20 relative z-20">
				<h2 className="md:text-center lg:leading-18 lg:text-6xl mx-auto font-extrabold">
					Push Your Logic <br />
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-tertiary">
						Beyond Limits.
					</span>
				</h2>
				<p className="md:text-center md:m-auto mt-8 md:max-w-1/2 ">Join the premier collegiate competitive programming guild. Master complex algorithms, compete in weekly rounds, and elevate your technical prowess with top peer mentors.</p>
				<div className="flex flex-wrap gap-4 m-auto w-fit mt-8">
					<Button className="text-gray-900 rounded px-8 py-4 cursor-pointer">Register for Welcome Contest <MoveRight /></Button>
					<Button className="bg-neutral-900 cursor-pointer rounded">Explore Problems</Button>
				</div>
				<div className="bg-neutral-900 md:w-5/12 p-6 m-auto text-xs mt-8 rounded border-1 border-solid border-gray-800">
					<h3 className="text-primary mb-2">FEATURED EVENT</h3>
					<div className="flex flex-wrap justify-between items-center">
						<h4 className="text-xl font-bold">{event.title}</h4>
						<div className="flex items-center gap-2 bg-neutral-800 py-2 px-3 rounded-2xl border-1 border-gray-800 border-solid">
							<div className="bg-green-600 w-2 h-2 rounded-2xl" />
							<p>
								{event.type}
							</p>
						</div>
					</div>
					<div className="w-full h-[1px] bg-gray-800 mt-6" />
					<p className="text-gray-500 mt-6 text-center">{event.category.toUpperCase()} STARTS IN</p>
					<div className="flex flex-wrap justify-around mt-4 text-sm">
						<div className="bg-neutral-800 p-5 text-center md:text-2xl border-1 border-solid border-gray-900 w-25 rounded-md">
							<span className="text-4xl mb-3 font-bold">{days}</span> <br /> DAYS
						</div>
						<div className="bg-neutral-800 p-5 text-center border-1 border-solid border-gray-900 w-25 rounded-md">
							<span className="text-4xl mb-3 font-bold">{hours}</span> <br /> HOURS
						</div>
						<div className="bg-neutral-800 p-5 text-center  border-1 border-solid border-gray-900 w-25 rounded-md">
							<span className="text-4xl mb-3 font-bold">{minutes}</span> <br /> MINUTES
						</div>
						<div className="bg-neutral-800 p-5 text-center text-primary  border-1 border-solid border-gray-900 w-25 rounded-md">
							<span className="text-4xl mb-3 font-bold">{seconds}</span> <br /> SECONDS
						</div>
					</div>
					<div className="w-full h-[1px] bg-gray-800 mt-6" />
					<div className="flex flex-wrap justify-around mt-6 items-center">
						<div className="text-center">
							<h4 className="text-gray-500 mb-2">Format</h4>
							<p>{event.format}</p>
						</div>
						<div className="text-center">
							<h4 className="text-gray-500 mb-2">Duration</h4>
							<p>{event.duration}</p>
						</div>
						<div className="text-center">
							<h4 className="text-gray-500 mb-2">Challenges</h4>
							<p>{event.challanges}</p>
						</div>
						<div className="text-center">
							<h4 className="text-gray-500 mb-2">Prize Pool</h4>
							<p>{event.prize} {event.typeOfPrize}</p>
						</div>
					</div>
					<div className="w-full h-[1px] bg-gray-800 mt-6" />
					<div className="flex flex-wrap gap-2.5 justify-between items-center mt-6">
						<p>Free entry for all collegiate students. Rating updates apply.</p>
						<Button className='text-black rounded cursor-pointer'>Confirm Registration</Button>
					</div>
				</div>
			</Container>
		</section>
	)
}

