import img from '../assets/image.png'

const InitialScreen = () => {
    return(
        <div className='w-full flex flex-col items-center justify-center p-4 text-center'>
              <h1 className='text-2xl md:text-3xl font-bold text-[#1891be]'>
                FlowViz
            </h1>
            <div className='text-sm md:text-md mb-5 text-gray-500 mt-2'>
            <span className="font-bold text-base md:text-lg text-gray-400">Visualize your ideas with ease.<br/></span>
              Turn plain text into interactive 
              <span className="font-bold"> flowcharts </span> 
              in seconds.<br/>
              </div>
            <img src={img} alt="image" className='self-center justify-self-center max-w-[90%] md:max-w-[70%] h-auto'/>
          </div>
    )
}
export default InitialScreen