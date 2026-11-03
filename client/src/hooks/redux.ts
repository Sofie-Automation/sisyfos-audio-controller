import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import {
    AppDispatch,
    ReduxStore,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<ReduxStore> = useSelector
