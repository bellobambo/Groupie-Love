import React from "react";
import { AiFillHeart } from "react-icons/ai";

const Header = () => {
  return (
    <div className="sticky top-0 z-50 w-full bg-[#0066FF] h-auto sm:h-[8vh] flex flex-col sm:flex-row items-center justify-between px-4 py-4 sm:py-0 gap-2 sm:gap-0">
      <p className="flex items-center text-2xl sm:text-[30px] text-white font-semibold font-georgia">
        Groupie Love
        <AiFillHeart className="ml-2 text-white animate-pulse" size={30} />
      </p>

      <p className="text-sm sm:text-[15px] text-white font-semibold font-georgia text-center sm:text-right">
        Show Love to your Favorite Creative!
      </p>
    </div>
  );
};

export default Header;
