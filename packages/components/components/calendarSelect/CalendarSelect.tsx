import { ComponentPropsWithoutRef } from 'react';
import { CalendarSelectOptions } from '@proton/shared/lib/interfaces/calendar';
import { Option } from '../option';
import { SelectTwo } from '../selectTwo';
import { SelectChangeEvent } from '../selectTwo/select';

import CalendarSelectIcon from './CalendarSelectIcon';

interface Props
    extends Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'onClick' | 'onChange' | 'onKeyDown' | 'aria-label'> {
    calendarID: string;
    options: CalendarSelectOptions[];
    onChange: (e: SelectChangeEvent<string>) => void;
    displayColor?: boolean;
}

const CalendarSelect = ({ calendarID, options, onChange, displayColor = true, ...rest }: Props) => {
    if (options.length === 1) {
        const { name, color } = options[0];

        return (
            <div className="field border-none flex flex-nowrap flex-align-items-center pl0">
                {displayColor && <CalendarSelectIcon color={color} className="flex-item-noshrink mr0-75" />}
                <span className="text-ellipsis">{name}</span>
            </div>
        );
    }

    return (
        <SelectTwo value={calendarID} onChange={onChange} {...rest}>
            {options.map(({ id, name, color }) => (
                <Option value={id} title={name} key={id}>
                    <div className="flex flex-nowrap flex-align-items-center">
                        {displayColor && <CalendarSelectIcon color={color} className="flex-item-noshrink mr0-75" />}
                        <div className="text-ellipsis">{name}</div>
                    </div>
                </Option>
            ))}
        </SelectTwo>
    );
};

export default CalendarSelect;
