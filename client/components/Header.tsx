"use client"
import { Container } from "./Container"
import Link from "next/link"
import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
} from "@/components/ui/avatar"
import { Field, FieldLabel } from "./ui/field"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ButtonGroup } from "./ui/button-group"
import { FaSearch } from "react-icons/fa";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { LogOutIcon, CreditCardIcon, UserIcon, SettingsIcon, Menu, X } from "lucide-react"
import { Menubar } from "@base-ui/react"
import { useState } from "react"


const links = [
	{ "name": 'Home', href: '/' },
	{ "name": 'Contests', href: '/contests' },
	{ "name": 'Problems', href: '/problems' },
	{ "name": 'Training', href: '/training' },
	{ "name": 'Leaderboard', href: '/leaderboard' },
	{ "name": 'Resources', href: '/resources' },
]

const Header = () => {
	const [isOpen, setIsOpen] = useState(false)
	let username = 'aeddiba'
	let rating = 1850
	const togglMenu = () => setIsOpen(!isOpen)
	console.log(isOpen)

	return (
		<div className="bg-neutral overflow-x-hidden border-b-1 border-solid border-b-gray-800">
			<Container>
				<div className="flex flex-row items-center h-14 text-white justify-between">
					<h1 className="text-primary">LEETCOMPETE</h1>
					<div className="">
						<div className="lg:hidden">
							<Menu onClick={togglMenu} />
						</div>
						<div className={`${!isOpen ? 'hidden' :
							'max-lg:flex max-lg:pt-5 w-full max-lg:h-full max-lg:flex-col max-lg:absolute max-lg:items-center max-lg:left-0 max-lg:top-14 bg-neutral'}
							lg:flex lg:flex-row lg:justify-around lg:items-center lg:gap-4`}>
							<Menubar className="flex max-lg:flex-col max-lg:text-center flex-row gap-3">
								{
									links.map((el, id) => {
										return (<Link href={el.href} key={id}>{el.name}</Link>)
									})
								}
							</Menubar>

							<div className="hidden bg-neutral-900 lg:flex flex-row items-center border-1 border-solid border-gray-700 px-2 rounded">
								<FaSearch />
								<Input className="border-none focus:outline-0" id="input-button-group" placeholder="Search Problems" />
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger>
									<div className="hidden cursor-pointer lg:flex items-center gap-3">
										<div className="bg-gray-600 w-[1px] h-8.5" />
										<Avatar>
											<AvatarImage
												src="https://github.com/shadcn.png"
												alt="@shadcn"
											/>
											<AvatarFallback>CN</AvatarFallback>
										</Avatar>
										<div>
											<div>
												@{username}
											</div>
											{
												rating ? <div className="text-orange-400">
													{rating}
												</div> : null
											}
										</div>
									</div>

								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem>
										<UserIcon />
										Profile
									</DropdownMenuItem>
									<DropdownMenuItem>
										<SettingsIcon />
										Settings
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem variant="destructive">
										<LogOutIcon />
										Log out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</Container >
		</div >
	)
}

export default Header
