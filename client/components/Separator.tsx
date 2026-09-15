import { Container } from "./Container";

export default function Separator() {
	return (
		<div className="bg-neutral">
			<Container>
				<div className="w-full bg-gray-800 h-[1px]" />
			</Container>
		</div>
	)
}

