import { Container } from "./Container";

export default function Separator() {
	return (
		<div className="bg-neutral py-8">
			<Container>
				<div className="w-full bg-gray-800 h-[1px]" />
			</Container>
		</div>
	)
}

