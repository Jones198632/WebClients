import { Children, isValidElement, ReactNode, useEffect, useRef } from 'react';
import { noop } from '@proton/shared/lib/helpers/function';

import ErrorBoundary from '../app/ErrorBoundary';
import { SettingsPageTitle, SettingsParagraph } from '../account';
import useAppTitle from '../../hooks/useAppTitle';
import createScrollIntoView from '../../helpers/createScrollIntoView';
import { classnames } from '../../helpers';
import { SettingsPropsShared } from './interface';
import useActiveSection from './useActiveSection';
import PrivateMainArea from './PrivateMainArea';
import SubSettingsSection from './SubSettingsSection';
import { getIsSubsectionAvailable } from './helper';

interface Props extends SettingsPropsShared {
    children: ReactNode;
    setActiveSection?: (section: string) => void;
}

const PrivateMainSettingsArea = ({ setActiveSection, location, children, config }: Props) => {
    const mainAreaRef = useRef<HTMLDivElement>(null);
    const useIntersectionSection = useRef(false);

    const { text: title, description, subsections } = config;

    useAppTitle(title);

    useEffect(() => {
        if (mainAreaRef.current) {
            mainAreaRef.current.scrollTop = 0;
        }
    }, [location.pathname]);

    useEffect(() => {
        const { hash } = location;

        if (!hash) {
            useIntersectionSection.current = true;
            return;
        }

        if (!mainAreaRef.current) {
            return;
        }
        const mainArea = mainAreaRef.current;
        const el = mainArea.querySelector(hash);
        if (!el) {
            return;
        }

        useIntersectionSection.current = false;
        setActiveSection?.(hash.slice(1));

        const abortScroll = createScrollIntoView(el, mainArea, true);
        let removeListeners: () => void;

        const abort = () => {
            useIntersectionSection.current = true;
            abortScroll();
            removeListeners?.();
        };

        const options = {
            passive: true,
            capture: true,
        };

        // Abort on any user interaction such as scrolling, touching, or keyboard interaction
        window.addEventListener('wheel', abort, options);
        window.addEventListener('keydown', abort, options);
        window.addEventListener('mousedown', abort, options);
        window.addEventListener('touchstart', abort, options);
        // Automatically abort after some time where it's assumed to have successfully scrolled into place.
        const timeoutId = window.setTimeout(abort, 15000);

        removeListeners = () => {
            window.removeEventListener('wheel', abort, options);
            window.removeEventListener('keydown', abort, options);
            window.removeEventListener('mousedown', abort, options);
            window.removeEventListener('touchstart', abort, options);
            window.clearTimeout(timeoutId);
        };

        return () => {
            abort();
        };
        // Listen to location instead of location.hash since it's possible to click the same #section multiple times and end up with a new entry in history
    }, [location]);

    // Don't always use the observer section observed value since it can not go to sections that are at the bottom or too small.
    // In those cases it can be overridden by clicking on a specific section
    const sectionObserver = useActiveSection(
        useIntersectionSection.current && setActiveSection ? setActiveSection : noop
    );

    const wrappedSections = Children.toArray(children).map((child, i) => {
        if (!isValidElement<{ observer: IntersectionObserver; className: string }>(child)) {
            return null;
        }
        const config = subsections?.[i];
        if (!config) {
            throw new Error('Missing subsection');
        }
        //
        if (!getIsSubsectionAvailable(config)) {
            return null;
        }
        return (
            <SubSettingsSection
                key={config.id}
                id={config.id}
                title={config.text}
                observer={sectionObserver}
                className="container-section-sticky-section"
            >
                {child}
            </SubSettingsSection>
        );
    });

    return (
        <PrivateMainArea ref={mainAreaRef}>
            <div className="container-section-sticky">
                <SettingsPageTitle className={classnames(['mt1-5', !description && 'mb1-5'])}>
                    {title}
                </SettingsPageTitle>
                {description && <SettingsParagraph className="mb1-5">{description}</SettingsParagraph>}
                <ErrorBoundary>{wrappedSections}</ErrorBoundary>
            </div>
        </PrivateMainArea>
    );
};

export default PrivateMainSettingsArea;
