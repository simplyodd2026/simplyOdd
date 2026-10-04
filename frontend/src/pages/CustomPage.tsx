import { CustomOrder } from '@/features/custom/CustomOrder'
import { useDocumentTitle } from '@/lib/hooks'

export default function CustomPage() {
  useDocumentTitle('Customise')
  return <CustomOrder />
}
