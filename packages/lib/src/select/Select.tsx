import * as Popover from "@radix-ui/react-popover";
import {
  ChangeEvent,
  FocusEvent,
  forwardRef,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import styled from "styled-components";
import { spaces } from "../common/variables";
import DxcIcon from "../icon/Icon";
import { Tooltip, TooltipWrapper } from "../tooltip/Tooltip";
import { HalstackLanguageContext } from "../HalstackContext";
import useWidth from "../utils/useWidth";
import Listbox from "./Listbox";
import {
  calculateWidth,
  canOpenListbox,
  filterOptionsBySearchValue,
  getLastOptionIndex,
  getSelectedOption,
  getSelectedOptionLabel,
  groupsHaveOptions,
  isArrayOfOptionGroups,
  notOptionalCheck,
} from "./utils";
import SelectPropsType, { ListOptionType, RefType } from "./types";
import DxcActionIcon from "../action-icon/ActionIcon";
import DxcFlex from "../flex/Flex";

const SelectContainer = styled.div<{
  margin: SelectPropsType["margin"];
  size: SelectPropsType["size"];
}>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: ${(props) => calculateWidth(props.margin, props.size)};
  ${(props) => props.size !== "fillParent" && `min-width:${calculateWidth(props.margin, props.size)}`};
  margin: ${(props) => (props.margin && typeof props.margin !== "object" ? spaces[props.margin] : "0px")};
  margin-top: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.top ? spaces[props.margin.top] : ""};
  margin-right: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.right ? spaces[props.margin.right] : ""};
  margin-bottom: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.bottom ? spaces[props.margin.bottom] : ""};
  margin-left: ${(props) =>
    props.margin && typeof props.margin === "object" && props.margin.left ? spaces[props.margin.left] : ""};
  font-family: var(--typography-font-family);
`;

const Label = styled.label<{
  disabled: SelectPropsType["disabled"];
  helperText: SelectPropsType["helperText"];
}>`
  color: var(${({ disabled }) => (disabled ? "--color-fg-neutral-medium" : "--color-fg-neutral-dark")});
  font-size: var(--typography-label-m);
  font-weight: var(--typography-label-semibold);
  ${({ helperText }) => !helperText && "margin-bottom: var(--spacing-gap-xs);"}

  > span {
    color: var(--color-fg-neutral-stronger);
    font-weight: var(--typography-label-regular);
  }
`;

const HelperText = styled.span<{ disabled: SelectPropsType["disabled"] }>`
  color: var(--color-fg-neutral-stronger);
  font-size: var(--typography-helper-text-s);
  font-weight: var(--typography-helper-text-regular);
  margin-bottom: var(--spacing-gap-xs);
`;

const Select = styled.div<{
  disabled: SelectPropsType["disabled"];
  error: SelectPropsType["error"];
}>`
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-gap-s);
  height: var(--height-m);
  padding: var(--spacing-padding-none) var(--spacing-padding-xs);
  border-radius: var(--border-radius-s);
  border: var(--border-width-s) var(--border-style-default) var(--border-color-neutral-dark);
  ${(props) =>
    props.error &&
    !props.disabled &&
    "border: var(--border-width-m) var(--border-style-default) var(--border-color-error-medium);"}

  ${(props) =>
    !props.disabled
      ? `
      cursor: pointer;
      &:hover {
        border-color: var(${props.error ? "--border-color-error-strong;" : "--border-color-primary-strong"});
      }
      &:focus-within {
        outline-offset: -2px;
        outline: var(--border-width-m) var(--border-style-default) var(--border-color-secondary-medium);
      }
    `
      : "background: var(--color-bg-neutral-lighter); border-color: var(--border-color-neutral-medium); cursor: not-allowed;"};

  /* Collapse indicator */
  > span[role="img"] {
    color: var(${({ disabled }) => (disabled ? "--color-fg-neutral-medium" : "--color-fg-neutral-dark")});
    font-size: var(--height-xxs);
  }
`;

const SelectionIndicator = styled.div<{ disabled: SelectPropsType["disabled"] }>`
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-width: 48px;
  min-height: var(--height-s);
  border-radius: var(--border-radius-xs);
  border: var(--border-width-s) var(--border-style-default)
    var(${({ disabled }) => (disabled ? "--border-color-neutral-strong" : "--border-color-neutral-light")});
`;

const SelectionNumber = styled.span<{ disabled: SelectPropsType["disabled"] }>`
  display: grid;
  place-items: center;
  background-color: ${({ disabled }) => (disabled ? "transparent" : "var(--color-bg-neutral-lighter)")};
  border-right: var(--border-width-s) var(--border-style-default)
    var(${({ disabled }) => (disabled ? "--border-color-neutral-medium" : "--border-color-neutral-light")});
  color: var(${(props) => (props.disabled ? "--color-fg-neutral-medium" : "--color-fg-neutral-dark")});
  font-size: var(--typography-label-s);
  font-weight: var(--typography-label-regular);
  text-align: center;
  user-select: none;
  ${(props) => (props.disabled ? `cursor: not-allowed;` : `cursor: default;`)}
`;

const ClearOptionsAction = styled.button`
  display: grid;
  place-items: center;
  background-color: transparent;
  border: none;
  padding: var(--spacing-padding-none);
  width: 100%;
  font-size: var(--height-xxxs);

  &:focus-visible {
    outline: none;
  }
  ${(props) =>
    !props.disabled
      ? `
      color: var(--color-fg-neutral-dark);
      cursor: pointer;
      &:hover {
        background-color: var(--color-bg-neutral-light);
      }
      &:active {
        background-color: var(--color-bg-neutral-strong);
      }
    `
      : "color: var(--color-fg-neutral-medium); cursor: not-allowed;"}
`;

const SearchableValueContainer = styled.div`
  display: grid;
  width: 100%;
`;

const SelectedOption = styled.span<{
  disabled: SelectPropsType["disabled"];
  atBackground: boolean;
}>`
  grid-area: 1 / 1 / 1 / 1;
  color: var(
    ${(props) =>
      props.disabled
        ? "--color-fg-neutral-medium"
        : props.atBackground
          ? "--color-fg-neutral-strong"
          : "--color-fg-neutral-dark"}
  );
  font-size: var(--typography-label-m);
  font-weight: var(--typography-label-regular);
  user-select: none;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SearchInput = styled.input`
  grid-area: 1 / 1 / 1 / 1;
  background: none;
  border: none;
  outline: none;
  padding: var(--spacing-padding-none);
  color: var(--color-fg-neutral-dark);
  font-family: var(--typography-font-family);
  font-size: var(--typography-label-m);
  font-weight: var(--typography-label-regular);
`;

const Error = styled.span`
  display: flex;
  align-items: center;
  gap: var(--spacing-gap-xs);
  color: var(--color-fg-error-medium);
  font-size: var(--typography-helper-text-s);
  font-weight: var(--typography-helper-text-regular, 400);
  margin-top: var(--spacing-gap-xs);

  /* Error icon */
  > span[role="img"] {
    font-size: var(--height-xxs);
  }
`;

const DxcSelect = forwardRef<RefType, SelectPropsType>(
  (
    {
      label,
      name = "",
      defaultValue,
      value,
      options,
      helperText,
      placeholder = "",
      disabled = false,
      multiple = false,
      optional = false,
      searchable = false,
      onChange,
      onBlur,
      error,
      margin,
      size = "medium",
      tabIndex = 0,
      ariaLabel = "Select",
    },
    ref
  ): JSX.Element => {
    const id = `select-${useId()}`;

    const [innerValue, setInnerValue] = useState(defaultValue ?? (multiple ? [] : ""));
    const [searchValue, setSearchValue] = useState("");
    const [visualFocusIndex, changeVisualFocusIndex] = useState(-1);
    const [isOpen, changeIsOpen] = useState(false);
    const [hasTooltip, setHasTooltip] = useState(false);
    const selectRef = useRef<HTMLDivElement | null>(null);
    const selectSearchInputRef = useRef<HTMLInputElement | null>(null);

    const width = useWidth(selectRef.current);
    const translatedLabels = useContext(HalstackLanguageContext);

    const optionalItem = useMemo(() => ({ label: placeholder, value: "" }), [placeholder]);
    const filteredOptions = useMemo(() => filterOptionsBySearchValue(options, searchValue), [options, searchValue]);
    const lastOptionIndex = useMemo(
      () => getLastOptionIndex(options, filteredOptions, searchable, optional, multiple),
      [options, filteredOptions, searchable, optional, multiple]
    );
    const { selectedOption, singleSelectionIndex } = useMemo(
      () => getSelectedOption(value ?? innerValue, options, multiple, optional, optionalItem),
      [value, innerValue, options, multiple, optional, optionalItem]
    );

    const openListbox = () => {
      if (!isOpen && canOpenListbox(options, disabled)) {
        changeIsOpen(true);
      }
    };
    const closeListbox = () => {
      if (isOpen) {
        changeIsOpen(false);
        changeVisualFocusIndex(-1);
      }
    };

    const handleOnChangeValue = useCallback(
      (newOption: ListOptionType | undefined) => {
        if (newOption) {
          let newValue: string | string[];

          if (multiple) {
            const currentValue = (value ?? innerValue) as string[];
            newValue = currentValue.includes(newOption.value)
              ? currentValue.filter((optionVal) => optionVal !== newOption.value)
              : [...currentValue, newOption.value];
          } else newValue = newOption.value;

          if (value == null) {
            setInnerValue(newValue);
          }
          onChange?.({
            value: newValue as string & string[],
            error: notOptionalCheck(newValue, multiple, optional)
              ? translatedLabels.formFields.requiredValueErrorMessage
              : undefined,
          });
        }
      },
      [multiple, value, innerValue, onChange, optional, translatedLabels]
    );
    const handleOnClick = () => {
      if (searchable) {
        selectSearchInputRef?.current?.focus();
      }
      if (isOpen) {
        closeListbox();
        setSearchValue("");
      } else {
        openListbox();
      }
    };
    const handleOnFocus = (event: FocusEvent<HTMLInputElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget) && searchable) {
        selectSearchInputRef?.current?.focus();
      }
    };
    const handleOnBlur = (event: FocusEvent<HTMLInputElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        closeListbox();
        setSearchValue("");

        const currentValue = value ?? innerValue;
        if (notOptionalCheck(currentValue, multiple, optional)) {
          onBlur?.({
            value: currentValue as string & string[],
            error: translatedLabels.formFields.requiredValueErrorMessage,
          });
        } else {
          onBlur?.({ value: currentValue as string & string[] });
        }
      }
    };
    const handleOnKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "Down":
        case "ArrowDown":
          event.preventDefault();
          if (
            singleSelectionIndex != null &&
            (!isOpen ||
              (visualFocusIndex === -1 && singleSelectionIndex > -1 && singleSelectionIndex <= lastOptionIndex))
          ) {
            changeVisualFocusIndex(singleSelectionIndex);
          } else {
            changeVisualFocusIndex((currentVisualFocusIndex) => {
              if (currentVisualFocusIndex < lastOptionIndex) {
                return currentVisualFocusIndex + 1;
              }
              return 0;
            });
          }
          openListbox();
          break;
        case "Up":
        case "ArrowUp":
          event.preventDefault();
          if (
            singleSelectionIndex != null &&
            (!isOpen ||
              (visualFocusIndex === -1 && singleSelectionIndex > -1 && singleSelectionIndex <= lastOptionIndex))
          ) {
            changeVisualFocusIndex(singleSelectionIndex);
          } else {
            changeVisualFocusIndex((currentVisualFocusIndex) =>
              currentVisualFocusIndex === 0 || currentVisualFocusIndex === -1
                ? lastOptionIndex
                : currentVisualFocusIndex - 1
            );
          }
          openListbox();
          break;
        case "Esc":
        case "Escape":
          event.preventDefault();
          if (isOpen) {
            event.stopPropagation();
          }
          closeListbox();
          setSearchValue("");
          break;
        case "Enter":
          if (isOpen && visualFocusIndex >= 0) {
            let accLength = optional && !multiple ? 1 : 0;
            if (searchable) {
              if (filteredOptions.length > 0) {
                if (optional && !multiple && visualFocusIndex === 0 && groupsHaveOptions(filteredOptions)) {
                  handleOnChangeValue(optionalItem);
                } else if (isArrayOfOptionGroups(filteredOptions)) {
                  if (groupsHaveOptions(filteredOptions)) {
                    filteredOptions.some((groupOption) => {
                      const groupLength = accLength + groupOption.options.length;
                      if (groupLength > visualFocusIndex) {
                        handleOnChangeValue(groupOption.options[visualFocusIndex - accLength]);
                      }
                      accLength = groupLength;
                      return groupLength > visualFocusIndex;
                    });
                  }
                } else {
                  handleOnChangeValue(filteredOptions[visualFocusIndex - accLength]);
                }
              }
            } else if (optional && !multiple && visualFocusIndex === 0) {
              handleOnChangeValue(optionalItem);
            } else if (isArrayOfOptionGroups(options)) {
              options.some((groupOption) => {
                const groupLength = accLength + groupOption.options.length;
                if (groupLength > visualFocusIndex) {
                  handleOnChangeValue(groupOption.options[visualFocusIndex - accLength]);
                }
                accLength = groupLength;
                return groupLength > visualFocusIndex;
              });
            } else {
              handleOnChangeValue(options[visualFocusIndex - accLength]);
            }
            if (!multiple) {
              closeListbox();
            }
            setSearchValue("");
          }
          break;
        default:
          break;
      }
    };
    const handleOnMouseEnter = (event: MouseEvent<HTMLSpanElement>) => {
      const text = event.currentTarget;
      setHasTooltip(text.scrollWidth > text.clientWidth);
    };

    const handleSearchIOnChange = (event: ChangeEvent<HTMLInputElement>) => {
      setSearchValue(event.target.value);
      changeVisualFocusIndex(-1);
      openListbox();
    };

    const handleClearOptionsActionOnClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (value == null) {
        setInnerValue([]);
      }
      if (!optional) {
        onChange?.({
          value: [] as string[] as string & string[],
          error: translatedLabels.formFields.requiredValueErrorMessage,
        });
      } else {
        onChange?.({ value: [] as string[] as string & string[] });
      }
    };

    const handleClearSearchActionOnClick = () => {
      setSearchValue("");
    };

    const handleOptionOnClick = useCallback(
      (option: ListOptionType) => {
        handleOnChangeValue(option);
        if (!multiple) {
          closeListbox();
        }
        setSearchValue("");
      },
      [handleOnChangeValue, closeListbox, multiple]
    );

    return (
      <SelectContainer margin={margin} size={size} ref={ref}>
        {label && (
          <Label
            id={`label-${id}`}
            disabled={disabled}
            onClick={() => {
              selectRef?.current?.focus();
            }}
            helperText={helperText}
          >
            {label} {optional && <span>{translatedLabels.formFields.optionalLabel}</span>}
          </Label>
        )}
        {helperText && <HelperText disabled={disabled}>{helperText}</HelperText>}
        <Popover.Root open={isOpen}>
          <Popover.Trigger asChild type={undefined}>
            <Select
              id={id}
              disabled={disabled}
              error={error}
              onBlur={handleOnBlur}
              onClick={handleOnClick}
              onFocus={handleOnFocus}
              onKeyDown={handleOnKeyDown}
              ref={selectRef}
              tabIndex={disabled ? -1 : tabIndex}
              role="combobox"
              aria-controls={isOpen ? `${id}-listbox` : undefined}
              aria-disabled={disabled}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-labelledby={label ? `label-${id}` : undefined}
              aria-activedescendant={visualFocusIndex >= 0 ? `option-${visualFocusIndex}` : undefined}
              aria-invalid={!!error}
              aria-errormessage={error ? `error-${id}` : undefined}
              aria-required={!disabled && !optional}
              aria-label={label ? undefined : ariaLabel}
            >
              {multiple && Array.isArray(selectedOption) && selectedOption.length > 0 && (
                <SelectionIndicator disabled={disabled}>
                  <SelectionNumber disabled={disabled}>{selectedOption.length}</SelectionNumber>
                  <Tooltip label={translatedLabels.select.actionClearSelectionTitle}>
                    <ClearOptionsAction
                      disabled={disabled}
                      onMouseDown={(event) => {
                        // Avoid input to lose focus when pressed
                        event.preventDefault();
                      }}
                      onClick={handleClearOptionsActionOnClick}
                      tabIndex={-1}
                      aria-label={translatedLabels.select.actionClearSelectionTitle}
                    >
                      <DxcIcon icon="clear" />
                    </ClearOptionsAction>
                  </Tooltip>
                </SelectionIndicator>
              )}
              <TooltipWrapper condition={hasTooltip} label={getSelectedOptionLabel(placeholder, selectedOption)}>
                <SearchableValueContainer>
                  <input
                    type="hidden"
                    name={name}
                    disabled={disabled}
                    value={
                      multiple
                        ? (Array.isArray(value) ? value : Array.isArray(innerValue) ? innerValue : []).join(",")
                        : (value ?? innerValue)
                    }
                  />
                  {searchable && (
                    <SearchInput
                      value={searchValue}
                      disabled={disabled}
                      onChange={handleSearchIOnChange}
                      ref={selectSearchInputRef}
                      autoComplete="nope"
                      autoCorrect="nope"
                      size={1}
                      aria-labelledby={label ? `label-${id}` : undefined}
                    />
                  )}
                  {(!searchable || searchValue === "") && (
                    <SelectedOption
                      disabled={disabled}
                      atBackground={
                        (multiple ? (value ?? innerValue).length === 0 : !(value ?? innerValue)) ||
                        (searchable && isOpen)
                      }
                      onMouseEnter={handleOnMouseEnter}
                    >
                      {getSelectedOptionLabel(placeholder, selectedOption)}
                    </SelectedOption>
                  )}
                </SearchableValueContainer>
              </TooltipWrapper>
              <DxcFlex alignItems="center">
                {searchable && searchValue.length > 0 && (
                  <Tooltip label={translatedLabels.select.actionClearSelectionTitle}>
                    <DxcActionIcon
                      icon="clear"
                      onClick={handleClearSearchActionOnClick}
                      tabIndex={-1}
                      title={translatedLabels.select.actionClearSearchTitle}
                    />
                  </Tooltip>
                )}
                <DxcIcon icon={isOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
              </DxcFlex>
            </Select>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              sideOffset={4}
              style={{ zIndex: "2147483647" }}
              onOpenAutoFocus={(event) => {
                // Avoid select to lose focus when the list is opened
                event.preventDefault();
              }}
              onCloseAutoFocus={(event) => {
                // Avoid select to lose focus when the list is closed
                event.preventDefault();
              }}
            >
              <Listbox
                id={`${id}-listbox`}
                currentValue={value ?? innerValue}
                options={searchable ? filteredOptions : options}
                visualFocusIndex={visualFocusIndex}
                lastOptionIndex={lastOptionIndex}
                multiple={multiple}
                optional={optional}
                optionalItem={optionalItem}
                searchable={searchable}
                handleOptionOnClick={handleOptionOnClick}
                styles={{ width }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        {!disabled && typeof error === "string" && (
          <Error id={`error-${id}`} role="alert" aria-live={error ? "assertive" : "off"}>
            {error && <DxcIcon icon="filled_error" />}
            {error}
          </Error>
        )}
      </SelectContainer>
    );
  }
);

export default DxcSelect;
