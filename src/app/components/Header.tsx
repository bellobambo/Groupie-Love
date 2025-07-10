import React from "react";
import { AiFillHeart } from "react-icons/ai";

const Header = () => {
  return (
    <div className="w-full bg-[#007FFF] h-[8vh] mb-8 flex items-center justify-between px-4">
      <p className="flex items-center text-[30px] text-white font-[500] font-georgia">
        Groupiee Love
        <AiFillHeart className="ml-2 text-white animate-pulse" size={40} />
      </p>

      <p className="text-[15px] text-white font-[600] font-georgia">
        Show Love to your Favorite Creative!
      </p>
    </div>
  );
};

export default Header;
