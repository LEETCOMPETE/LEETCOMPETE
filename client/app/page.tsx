import Calender from "@/components/Calender";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Question from "@/components/Question";
import Separator from "@/components/Separator";
import Image from "next/image";

export default function Home() {
	return (
		<>
			<Header />
			<main>
				<Hero />
				<Separator />
				<Question />
				<Separator />
				<Calender />
			</main>
			<Footer />
		</>
	);
}
