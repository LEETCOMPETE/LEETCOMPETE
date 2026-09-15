import { MoveRight } from "lucide-react";
import { Container } from "./Container";
import { Button } from "@base-ui/react";
import { Badge } from "./ui/badge";

const calender = [
	{
		title: 'Dynamic Programming Masterclass',
		date: '10-14-2026 15:00',
		time: '2 hours',
		type: "Workshop",
		place: "agora",
		badgeColor: "bg-green-500",
		textColor: "text-green-900"
	},
	{
		title: 'Dynamic Programming Masterclass',
		date: '10-14-2026 15:00',
		time: '2 hours',
		type: "Workshop",
		place: "agora",
		badgeColor: "bg-green-500",
		textColor: "text-green-900"
	},
	{
		title: 'Dynamic Programming Masterclass',
		date: '10-14-2026 15:00',
		time: '2 hours',
		type: "Workshop",
		place: "agora",
		badgeColor: "bg-green-500",
		textColor: "text-green-900"
	},
	{
		title: 'Dynamic Programming Masterclass',
		date: '10-14-2026 15:00',
		time: '2 hours',
		type: "Workshop",
		place: "agora",
		badgeColor: "bg-green-500",
		textColor: "text-green-900"
	},
]

export default function Calender() {
	return (
		<div className="bg-neutral text-white p-8">
			<Container>
				<h2 className="text-primary uppercase">Calendar</h2>
				<div className="flex justify-between items-center mt-8">
					<h3 className="text-2xl font-bold">Upcoming Sessions</h3>
					<a href="/" className="flex gap-1.5 text-sm items-center">
						<span>Full Schedule</span>
						<MoveRight color="#ffffff" size={15} />
					</a>
				</div>
				<div className="w-full p-8">
					{
						calender.map((el, id) => {
							const date = new Date(el.date)
							const time = date.getHours()
							const day = date.getDate()
							const mount = date.toLocaleString('en-Us', { month: 'short' })
							return (
								<div key={id} className="flex flex-row gap-8 items-center w-full bg-neutral-900 border-1 border-solid border-gray-600 p-8 my-5 rounded-sm">
									<div className="w-12 h-12 rounded bg-neutral-800 border-1 border-gray-600 border-solid text-center text-xs p-2">
										{mount} <br /> {day}
									</div>
									<div className="flex gap-2">
										<div>

											<h3>{el.title}</h3>
											<p className="text-gray-400 text-[12px]">{time} GMT • {el.time} • {el.place}</p>
										</div>
										<Badge className={`rounded ${el.badgeColor} ${el.textColor}`}>{el.type}</Badge>
									</div>
									<Button className="cursor-pointer bg-neutral-800 px-5 py-3 text-sm rounded ml-auto">RSVP</Button>
								</div>
							)
						})
					}
				</div>
			</Container>
		</div>
	)
}

