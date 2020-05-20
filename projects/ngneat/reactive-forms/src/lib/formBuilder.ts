import { Injectable } from '@angular/core';
import { FormBuilder as NgFormBuilder } from '@angular/forms';
import { FormArray } from './formArray';
import { FormControl } from './formControl';
import { FormGroup } from './formGroup';
import { AbstractControl, AbstractControlOptions, AsyncValidatorFn, ValidatorFn } from './types';

function isAbstractControlOptions<T>(
  options: AbstractControlOptions<T> | { [key: string]: any }
): options is AbstractControlOptions<T> {
  return (
    (<AbstractControlOptions<T>>options).asyncValidators !== undefined ||
    (<AbstractControlOptions<T>>options).validators !== undefined ||
    (<AbstractControlOptions<T>>options).updateOn !== undefined
  );
}

export type ControlType<T> = T | { value: T; disabled?: boolean };

export type FbControlConfig<T = any> =
  | AbstractControl<T>
  | [ControlType<T>, ValidatorFn<T> | ValidatorFn<T>[] | null, AsyncValidatorFn<T> | AsyncValidatorFn<T>[] | null]
  | [ControlType<T>, ValidatorFn<T> | ValidatorFn<T>[] | AbstractControlOptions<T> | null]
  | [T | ControlType<T>]
  | ControlType<T>
  | T;

export type FbGroupConfig<T = any> = { [key in keyof T]: FbControlConfig<T[key]> };

@Injectable({ providedIn: 'root' })
export class FormBuilder extends NgFormBuilder {
  group<T, GroupConfig extends FbGroupConfig<T> = FbGroupConfig<T>>(
    controlsConfig: GroupConfig,
    options?:
      | AbstractControlOptions<T>
      | {
          validator?: ValidatorFn<T> | ValidatorFn<T>[];
          asyncValidator?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[];
        }
      | null
  ): FormGroup<T> {
    const controls = this._reduceControls(controlsConfig);

    let validators: ValidatorFn<T> | ValidatorFn<T>[] | null = null;
    let asyncValidators: AsyncValidatorFn<T> | AsyncValidatorFn<T>[] | null = null;
    let updateOn: AbstractControlOptions<T>['updateOn'] | undefined;

    if (options != null) {
      if (isAbstractControlOptions(options)) {
        validators = options.validators != null ? options.validators : null;
        asyncValidators = options.asyncValidators != null ? options.asyncValidators : null;
        updateOn = options.updateOn != null ? options.updateOn : undefined;
      } else {
        // `options` are legacy form group options
        validators = options['validator'] != null ? options['validator'] : null;
        asyncValidators = options['asyncValidator'] != null ? options['asyncValidator'] : null;
      }
    }

    return new FormGroup(controls, { asyncValidators, updateOn, validators });
  }

  control<T = any>(
    formState: T,
    validatorOrOpts?: ValidatorFn<T> | ValidatorFn<T>[] | AbstractControlOptions<T> | null,
    asyncValidator?: AsyncValidatorFn<T> | AsyncValidatorFn<T>[] | null
  ): FormControl<T> {
    return new FormControl<T>(formState, validatorOrOpts, asyncValidator);
  }

  array<T>(
    controlsConfig: FbControlConfig<T>[],
    validatorOrOpts?: ValidatorFn<T[]> | ValidatorFn<T[]>[] | AbstractControlOptions<T[]> | null,
    asyncValidator?: AsyncValidatorFn<T[]> | AsyncValidatorFn<T[]>[] | null
  ): FormArray<T> {
    const controls = controlsConfig.map(c => this._createControl(c));
    return new FormArray<T>(controls, validatorOrOpts, asyncValidator);
  }

  /** @internal */
  _reduceControls<T>(
    controlsConfig: { [key in keyof T]: FbControlConfig<T[key]> }
  ): { [key in keyof T]: FormControl<T[key]> } {
    const controls = {};
    Object.keys(controlsConfig).forEach(controlName => {
      controls[controlName] = this._createControl(controlsConfig[controlName]);
    });
    return controls as { [key in keyof T]: FormControl<T[key]> };
  }

  /** @internal */
  _createControl<T>(controlConfig: FbControlConfig<T>): AbstractControl<T> {
    if (
      controlConfig instanceof FormControl ||
      controlConfig instanceof FormGroup ||
      controlConfig instanceof FormArray
    ) {
      return controlConfig as AbstractControl<T>;
    } else if (Array.isArray(controlConfig)) {
      const value = controlConfig[0];
      const validator = controlConfig.length > 1 ? controlConfig[1] : (null as ValidatorFn<T>);
      const asyncValidator = controlConfig.length > 2 ? controlConfig[2] : (null as AsyncValidatorFn<T>);
      return this.control(value, validator, asyncValidator) as AbstractControl<T>;
    } else {
      return this.control(controlConfig) as AbstractControl<T>;
    }
  }
}
