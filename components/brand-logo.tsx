import Link from 'next/link'
import {IdanuBrand} from '@/components/idanu-brand'
interface BrandLogoProps {className?:string;textClassName?:string}
export function BrandLogo({className='',textClassName='text-lg'}:BrandLogoProps){
 return <Link href="/" className={`inline-flex items-center ${className}`} aria-label="Idanu home"><span className={textClassName}><IdanuBrand/></span></Link>
}