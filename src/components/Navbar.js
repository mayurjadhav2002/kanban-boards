import React, { useEffect, useState } from 'react'
import "./navbar.css"
import { Link } from "react-router-dom"
import { useUserContext } from '../utils/UserContext/UserContext'
import { APIstatusAnnouncBar, AfterLoginMenu, BeforeLoginMenu, UserMenu } from './Misc/NavMenus'
import { Button } from './ui/button'


function Navbar() {
  const { loggedin, user, handleLogout, APIAwake } = useUserContext();
  return (
    <div className='shadow-sm top-0 bg-white dark:bg-dark  z-50 sm:relative  md:sticky'>
      {!APIAwake && <APIstatusAnnouncBar />}
      <div className="mx-auto flex shadow-sm items-center justify-between px-4 py-2 dark:bg-dark dark:text-white dark:border-b-2 dark:border-gray-400">
        <div className="flex items-center space-x-2 gap-5">
          <button type="button"
            className=" flex appearance-none p-1 text-gray-500 md:hidden justify-center items-center gap-2 rounded-md border border-transparent font-semibold "
            data-hs-overlay="#hs-overlay-example">
            <svg className="h-6 w-6" fill="currentcolor" viewBox="0 0 256 256">
              <line
                x1={40}
                y1={128}
                x2={216}
                y2={128}
                fill="none"
                stroke="currentcolor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={24}
              />
              <line
                x1={40}
                y1={64}
                x2={216}
                y2={64}
                fill="none"
                stroke="currentcolor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={24}
              />
              <line
                x1={40}
                y1={192}
                x2={216}
                y2={192}
                fill="none"
                stroke="currentcolor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={24}
              />
            </svg>
          </button>
          <Link to="/" >

            <span className="text-md lg:text-2xl items-start">
              <span className="text-blue-600">P</span><span className="font-light">ro</span><span className="font-thin">gress</span>
            </span>
          </Link>
          <div className='lg:block hidden'>

          {!loggedin ?
            <BeforeLoginMenu />
            :
            <>
              <AfterLoginMenu />
            </>
          }
          </div>
        </div>
        <nav className="flex items-center space-x-1 font-medium text-gray-800 gap-2">
          {!loggedin ?
            <>
              <Link to="/login">
                <Button>Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Register</Button>
              </Link>
            </>
            :
            <>
              <UserMenu avatar={user.avatar} handleLogout={handleLogout} />
            </>}
        </nav>
      </div>
    </div>
  )
}

export default Navbar