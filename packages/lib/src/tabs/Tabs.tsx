import {
  Children,
  isValidElement,
  KeyboardEvent,
  ReactElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import TabsContext from "./TabsContext";
import DxcTab, { sharedTabStyles } from "./Tab";
import TabsPropsType, { TabProps } from "./types";
import DxcTabsLegacy from "./TabsLegacy";
import { spaces } from "../common/variables";
import { HalstackLanguageContext } from "../HalstackContext";
import DxcIcon from "../icon/Icon";
import { useResize, getPreviousTabIndex, getNextTabIndex } from "./utils";

const TabsContainer = styled.div<{ margin: TabsPropsType["margin"] }>`
  position: relative;
  margin: ${(props) => (props.margin && typeof props.margin !== "object" ? spaces[props.margin] : "0px")};
  margin-top: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.top ? spaces[props.margin.top] : ""};
  margin-right: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.right ? spaces[props.margin.right] : ""};
  margin-bottom: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.bottom ? spaces[props.margin.bottom] : ""};
  margin-left: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.left ? spaces[props.margin.left] : ""};
`;

const Underline = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: var(--border-width-s);
  background-color: var(--border-color-neutral-medium);
`;

const Tabs = styled.div`
  display: flex;
  background-color: var(--color-bg-neutral-lightest);
  overflow: hidden;
`;

const ScrollIndicator = styled.button`
  display: grid;
  place-items: center;
  min-width: var(--height-xxl);
  height: 100%;
  padding: 0;
  background: var(--color-bg-neutral-lightest);
  border: 0;
  ${sharedTabStyles}

  /* Scroll indicator arrow icon */
  > span {
    display: flex;
    font-size: var(--height-s);
    svg {
      height: var(--height-s);
      width: 24px;
    }
  }
`;

const TabsContent = styled.div`
  flex: 1 1 auto;
  display: inline-block;
  position: relative;
  white-space: nowrap;
  overflow-x: scroll;
  ::-webkit-scrollbar {
    display: none;
  }
`;

const ScrollableTabsList = styled.div<{
  translateScroll: number;
  enabled: boolean;
}>`
  display: flex;
  ${({ enabled, translateScroll }) =>
    enabled ? `transform: translateX(${translateScroll}px)` : "transform: translateX(0px)"};
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
`;

const DxcTabs = ({
  activeTabIndex,
  children,
  defaultActiveTabIndex,
  iconPosition,
  margin,
  onTabClick,
  onTabHover,
  tabIndex = 0,
  tabs,
}: TabsPropsType) => {
  const childrenArray: ReactElement<TabProps>[] = useMemo(
    () => Children.toArray(children) as ReactElement<TabProps>[],
    [children]
  );

  const [activeTabLabel, setActiveTabLabel] = useState(() => {
    const hasActiveChild = childrenArray.some(
      (child) => isValidElement(child) && (child.props.active || child.props.defaultActive) && !child.props.disabled
    );
    const initialActiveTab = hasActiveChild
      ? childrenArray.find(
          (child) => isValidElement(child) && (child.props.active || child.props.defaultActive) && !child.props.disabled
        )
      : childrenArray.find((child) => isValidElement(child) && !child.props.disabled);

    return isValidElement(initialActiveTab) ? initialActiveTab.props.label : "";
  });
  const [innerFocusIndex, setInnerFocusIndex] = useState<number | null>(null);
  const [countClick, setCountClick] = useState(0);
  const [totalTabsWidth, setTotalTabsWidth] = useState(0);
  const [translateScroll, setTranslateScroll] = useState(0);
  const [scrollRightEnabled, setScrollRightEnabled] = useState(true);
  const [scrollLeftEnabled, setScrollLeftEnabled] = useState(false);
  const refTabList = useRef<HTMLDivElement | null>(null);
  const viewWidth = useResize(refTabList);
  const translatedLabels = useContext(HalstackLanguageContext);
  const enabledScrollIndicators = useMemo(() => viewWidth < totalTabsWidth, [viewWidth]);

  useEffect(() => {
    if (refTabList.current) {
      setTotalTabsWidth((refTabList.current.firstElementChild as HTMLElement)?.offsetWidth);
    }
  }, []);

  const contextValue = useMemo(() => {
    const focusedChild = innerFocusIndex != null ? childrenArray[innerFocusIndex] : null;
    return {
      activeLabel: activeTabLabel,
      focusedLabel: isValidElement(focusedChild) ? focusedChild.props.label : "",
      iconPosition,
      isControlled: childrenArray.some((child) => isValidElement(child) && typeof child.props.active !== "undefined"),
      setActiveLabel: setActiveTabLabel,
      tabIndex,
    };
  }, [iconPosition, tabIndex, innerFocusIndex, activeTabLabel, childrenArray]);

  const scrollLeft = () => {
    const scrollWidth = (refTabList?.current?.offsetHeight ?? 0) * 0.75;
    let moveX = 0;
    if (countClick <= scrollWidth) {
      moveX = 0;
      setScrollLeftEnabled(false);
      setScrollRightEnabled(true);
    } else {
      moveX = countClick - scrollWidth;
      setScrollRightEnabled(true);
      setScrollLeftEnabled(true);
    }
    setTranslateScroll(-moveX);
    setCountClick(moveX);
  };

  const scrollRight = () => {
    const offsetHeight = refTabList?.current?.offsetHeight ?? 0;
    const scrollWidth = offsetHeight * 0.75;
    let moveX = 0;
    if (countClick + scrollWidth + offsetHeight >= totalTabsWidth) {
      moveX = totalTabsWidth - offsetHeight;
      setScrollRightEnabled(false);
      setScrollLeftEnabled(true);
    } else {
      moveX = countClick + scrollWidth;
      setScrollLeftEnabled(true);
      setScrollRightEnabled(true);
    }
    setTranslateScroll(-moveX);
    setCountClick(moveX);
  };

  const handleOnKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const activeTab = childrenArray.findIndex((child: ReactElement) => child.props.label === activeTabLabel);
    switch (event.key) {
      case "Left":
      case "ArrowLeft":
        event.preventDefault();
        setInnerFocusIndex(getPreviousTabIndex(childrenArray, innerFocusIndex === null ? activeTab : innerFocusIndex));
        break;
      case "Right":
      case "ArrowRight":
        event.preventDefault();
        setInnerFocusIndex(getNextTabIndex(childrenArray, innerFocusIndex === null ? activeTab : innerFocusIndex));
        break;
      case "Tab":
        if (activeTab !== innerFocusIndex) {
          setInnerFocusIndex(activeTab);
        }
        break;
      default:
        break;
    }
  };

  return children ? (
    <>
      <TabsContainer margin={margin}>
        <Underline />
        <Tabs>
          {enabledScrollIndicators && (
            <ScrollIndicator
              onClick={scrollLeft}
              disabled={!scrollLeftEnabled}
              aria-label={translatedLabels.tabs.scrollLeft}
              tabIndex={scrollLeftEnabled ? tabIndex : -1}
            >
              <DxcIcon icon="keyboard_arrow_left" />
            </ScrollIndicator>
          )}
          <TabsContent>
            <ScrollableTabsList
              role="tablist"
              translateScroll={translateScroll}
              ref={refTabList}
              enabled={enabledScrollIndicators}
              onKeyDown={handleOnKeyDown}
            >
              <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>
            </ScrollableTabsList>
          </TabsContent>
          {enabledScrollIndicators && (
            <ScrollIndicator
              onClick={scrollRight}
              disabled={!scrollRightEnabled}
              aria-label={translatedLabels.tabs.scrollRight}
              tabIndex={scrollRightEnabled ? tabIndex : -1}
            >
              <DxcIcon icon="keyboard_arrow_right" />
            </ScrollIndicator>
          )}
        </Tabs>
      </TabsContainer>
      {Children.map(children, (child) =>
        isValidElement(child) && child.props.label === activeTabLabel ? child.props.children : null
      )}
    </>
  ) : (
    tabs != null && (
      <DxcTabsLegacy
        defaultActiveTabIndex={defaultActiveTabIndex}
        activeTabIndex={activeTabIndex}
        tabs={tabs}
        onTabClick={onTabClick}
        onTabHover={onTabHover}
        margin={margin}
        iconPosition={iconPosition}
        tabIndex={tabIndex}
      />
    )
  );
};

DxcTabs.Tab = DxcTab;

export default DxcTabs;
