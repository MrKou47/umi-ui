import React, { useContext } from 'react';
import { Col, message, Spin, Typography, Button, Tooltip } from 'antd';
import { ButtonProps } from 'antd/es/button';
import { ExportOutlined } from '@ant-design/icons';
import { Block, AddBlockParams, Resource } from '@umijs/block-sdk/lib/data.d';
import { ResourceType, AssetType } from '@umijs/block-sdk/lib/enum';
import { IUiApi } from '@umijs/ui-types';

import styles from './index.module.less';
import HighlightedText from './HighlightedText';
import getInsertPosition, { PositionData } from './getInsertPosition';
import Context from '../UIApiContext';
import BlockContext from '../components/BlockContext';
import ImageLoad from './ImageLoad';
import ImagePreview from './ImagePreview';

/**
 * 子区块 的 tag
 * @param
 */
export const Meats: React.FC<{
  item: Block;
  keyword?: string;
}> = ({ item, keyword }) => (
  <div className={styles.meats}>
    <span className={styles.tags}>
      {item.tags &&
        item.tags.map((tag: string) => (
          <span key={tag} className={styles.tagInCard}>
            <HighlightedText text={tag} highlight={keyword} />
          </span>
        ))}
    </span>
  </div>
);

export interface BlockItemProps {
  type: Resource['blockType'];
  addingBlock?: Block;
  item: Block;
  disabled?: boolean;
  loading?: boolean;
  onShowModal?: (Block: Block, option: AddBlockParams) => void;
  onHideModal?: () => void;
  keyword?: string;
  selectedTag?: string;
}

/**
 * 将绝对路径转化为相对路径
 * @param api
 * @param filenamePath
 */
export const getPathFromFilename = async (api: IUiApi, filenamePath: string): Promise<string> => {
  const { data } = (await api.callRemote({
    type: 'org.umi.block.getRelativePagesPath',
    payload: {
      path: filenamePath,
    },
  })) as {
    data: string;
  };
  // /Users/userName/code/test/umi-block-test/src/page(s)/xxx/index.ts
  // or /Users/userName/code/test/umi-pro/src/page(s)/xxx.js
  // -> /xxx
  return data.replace(/(index)?((\.js?)|(\.tsx?)|(\.jsx?))$/, '');
};

/**
 * 打开 modal 框之前的一些处理
 * @param api  umi ui 的 api 全局对象
 * @param param 参数
 */
const onBeforeOpenModal = async (api, { item, type, onShowModal, currentResource }) => {
  try {
    await api.callRemote({
      type: 'org.umi.block.checkIfCanAdd',
      payload: {
        item,
        type,
        currentResource,
      },
    });
  } catch (e) {
    message.error(e.message);
    return;
  }

  const isBlock =
    currentResource?.resourceType === ResourceType.dumi
      ? type === AssetType.BLOCK
      : type === 'block';
  if (api.isMini() && isBlock) {
    // umi ui 中区块有自己独有的打开方式
    try {
      const position = await getInsertPosition(api);
      console.log('position', position);
      const targetPath = await getPathFromFilename(api, position.filename);
      const option = {
        path: targetPath,
        filename: position.filename,
        index: position.index,
        blockTarget: targetPath,
      };
      onShowModal(item, option);
    } catch (e) {
      console.error('BlockItem error', e);
      message.error(e.message);
    }
    return;
  }
  onShowModal(item, {});
};

interface ToolTipAddButtonProps extends ButtonProps {
  disabledTitle?: string;
}

const ToolTipAddButton: React.FC<ToolTipAddButtonProps> = ({
  disabledTitle,
  disabled,
  children,
  ...reset
}) => {
  if (disabled) {
    return (
      <Tooltip title={disabledTitle}>
        <Button className={styles.addBtn} type="primary" disabled={disabled} {...reset}>
          {children}
        </Button>
      </Tooltip>
    );
  }
  return (
    <Button className={styles.addBtn} type="primary" disabled={disabled} {...reset}>
      {children}
    </Button>
  );
};

const BlockItem: React.FC<BlockItemProps> = ({
  type,
  item,
  loading = false,
  disabled,
  onShowModal,
  keyword,
  selectedTag,
}) => {
  const { api } = useContext(Context);
  const { currentResource } = useContext(BlockContext);
  const { useIntl } = api;
  const { formatMessage: intl } = useIntl();
  const isMini = api.isMini();
  const img = item.img || item.thumbnail;

  const handleAddButtonClick = async () => {
    await onBeforeOpenModal(api, {
      type,
      item,
      onShowModal,
      currentResource,
    });
  };

  return (
    <Col className={styles.col} key={item.url}>
      <div
        id={item.url}
        className={styles.templateCard}
        onClick={() => {
          if (loading) {
            onShowModal(item, {});
          }
        }}
      >
        <Spin spinning={loading} tip="添加中...">
          <div className={styles.demo}>
            <div className={styles.addProject}>
              <ToolTipAddButton
                type="primary"
                disabled={disabled}
                disabledTitle={intl({
                  id: 'org.umi.ui.blocks.adder.disabledTitle',
                })}
                onClick={handleAddButtonClick}
              >
                {loading
                  ? intl({ id: 'org.umi.ui.blocks.list.viewlog' })
                  : intl({ id: 'org.umi.ui.blocks.list.add' })}
              </ToolTipAddButton>

              <div className={`${styles.btnGroup} ${item.previewUrl ? styles.hasPreview : ''}`}>
                <ImagePreview img={img} cls={styles.previewBtn} />
                <div className={styles.btnSep} />
                {item.previewUrl && (
                  <Tooltip
                    title={intl({ id: 'org.umi.ui.blocks.list.preview.demo' })}
                    placement="bottom"
                  >
                    <Button className={styles.previewBtn} target="_blank" href={item.previewUrl}>
                      <ExportOutlined />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>

            <ImageLoad src={img} />
          </div>
        </Spin>

        <div className={styles.content}>
          <div className={styles.title}>
            <HighlightedText text={item.name} highlight={keyword} />
          </div>
          {item.description && !isMini && (
            <Typography.Paragraph
              className={styles.description}
              ellipsis={{ rows: 2, expandable: false }}
            >
              <HighlightedText text={item.description} highlight={keyword} />
            </Typography.Paragraph>
          )}
          {!isMini && selectedTag === '' && <Meats item={item} keyword={keyword} />}
        </div>
      </div>
    </Col>
  );
};

export default BlockItem;
